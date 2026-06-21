using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microservicios.Atracciones.Booking.DataAccess;       
using Microservicios.Atracciones.Booking.DataManagement;   
using Microservicios.Atracciones.Booking.Business;         
using Microservicios.Atracciones.Booking.API.Middleware;
using Microsoft.OpenApi.Models;
using MassTransit;
using Microservicios.Atracciones.Booking.API.Consumers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpContextAccessor();

builder.Services.AddDataAccessServices(builder.Configuration);
builder.Services.AddDataManagementServices();
builder.Services.AddBusinessServices();

builder.Services.AddGrpcClient<Microservicios.Atracciones.Shared.gRPC.CatalogService.CatalogServiceClient>(o =>
{
    // Apuntamos a la URL de Catalog.API segura (HTTPS) en la nube o local con certificado
    var catalogUrl = builder.Configuration["GrpcServices:CatalogAddress"] ?? "https://localhost:5002";
    o.Address = new Uri(catalogUrl);
})
// Resiliencia (Polly v8 via Microsoft.Extensions.Http.Resilience):
// la validación gRPC ValidateBookingData es idempotente (solo lee/valida), así que
// es seguro reintentarla. El handler estándar aporta Retry (3 intentos con backoff
// exponencial), Circuit Breaker y Timeout ante micro-cortes de red contra Catalog.
.AddStandardResilienceHandler();
// ── Event Bus (MassTransit + RabbitMQ / CloudAMQP) ──
// Booking es PUBLISHER: al crear una reserva publica BookingCreatedEvent y Billing lo
// consume de forma asíncrona (reemplaza la antigua llamada gRPC síncrona a Billing).
// Booking es CONSUMER: escucha PaymentApprovedEvent para actualizar el estado de reserva a Confirmado.
// La conexión sale de RabbitMq:ConnectionString (env var RabbitMq__ConnectionString en Azure).
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<PaymentApprovedConsumer>();
    
    x.UsingRabbitMq((context, cfg) =>
    {
        var rabbitConnection = builder.Configuration["RabbitMq:ConnectionString"]
            ?? throw new InvalidOperationException("Falta la configuración RabbitMq:ConnectionString.");
        cfg.Host(new Uri(rabbitConnection));
        cfg.ConfigureEndpoints(context);
    });
});

builder.Services.AddControllers(options => 
{
    options.Filters.Add<Microservicios.Atracciones.Booking.API.Filters.ApiResponseWrapperFilter>();
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Booking Microservice API", Version = "v1" });
    
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme."
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var jwtKey = builder.Configuration["Jwt:Key"] ?? "BookingService_Super_Secret_Key_2026_Minimum_Length_Requirement_Long_String"; 
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "BookingService";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "BookingServiceUsers";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c => 
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Booking Microservice API v1");
    c.RoutePrefix = string.Empty; 
});

app.UseMiddleware<ExceptionMiddleware>();
app.UseStaticFiles();

app.UseHttpsRedirection();
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
