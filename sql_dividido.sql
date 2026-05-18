
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ************************************************************
-- 1. DB_IDENTITY (Identidad y Perfiles)
-- ************************************************************
CREATE TABLE audit_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), correlation_id UUID, table_name VARCHAR(100), record_id UUID, action VARCHAR(10), changed_by VARCHAR(256), changed_at TIMESTAMPTZ DEFAULT NOW(), old_values JSONB, new_values JSONB, ip_address VARCHAR(50), user_agent TEXT, endpoint TEXT);

CREATE TABLE role (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(50) NOT NULL UNIQUE, description TEXT);
CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(256) NOT NULL UNIQUE, password_hash TEXT NOT NULL, is_active BOOLEAN DEFAULT TRUE, reset_password_token VARCHAR(255), reset_password_expiry TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ);
CREATE TABLE user_role (user_id UUID REFERENCES users(id) ON DELETE CASCADE, role_id UUID REFERENCES role(id), PRIMARY KEY (user_id, role_id) );
CREATE TABLE client (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, phone VARCHAR(20), birth_date DATE, nationality VARCHAR(100), document_type VARCHAR(20), document_number VARCHAR(50), location_id UUID, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ);

-- ************************************************************
-- 2. DB_CATALOG (Catálogo simplificado - solo español)
-- ************************************************************
CREATE TABLE audit_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), correlation_id UUID, table_name VARCHAR(100), record_id UUID, action VARCHAR(10), changed_by VARCHAR(256), changed_at TIMESTAMPTZ DEFAULT NOW(), old_values JSONB, new_values JSONB, ip_address VARCHAR(50), user_agent TEXT, endpoint TEXT);

CREATE TABLE media_type (id SMALLINT PRIMARY KEY, name VARCHAR(20) NOT NULL UNIQUE);
CREATE TABLE ticket_category (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(50) NOT NULL, name_en VARCHAR(80), age_range_min SMALLINT, age_range_max SMALLINT, sort_order SMALLINT DEFAULT 0, is_active BOOLEAN DEFAULT TRUE);
CREATE TABLE locations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) NOT NULL, type VARCHAR(50) NOT NULL, country_code VARCHAR(2), parent_id UUID REFERENCES locations(id));
CREATE TABLE category (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug VARCHAR(100) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL, icon_url TEXT, sort_order SMALLINT DEFAULT 0, is_active BOOLEAN DEFAULT TRUE);
CREATE TABLE subcategory (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), category_id UUID REFERENCES category(id) ON DELETE CASCADE, slug VARCHAR(100) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL, icon_url TEXT, sort_order SMALLINT DEFAULT 0, is_active BOOLEAN DEFAULT TRUE);
CREATE TABLE tag (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(50) NOT NULL, slug VARCHAR(50) NOT NULL UNIQUE);
CREATE TABLE inclusion_item (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), icon_slug VARCHAR(50), default_text TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE attraction (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), location_id UUID REFERENCES locations(id), subcategory_id UUID REFERENCES subcategory(id), slug VARCHAR(200) NOT NULL UNIQUE, name VARCHAR(150) NOT NULL, description_short VARCHAR(255), description_full TEXT, address TEXT, latitude NUMERIC(9,6), longitude NUMERIC(9,6), meeting_point TEXT, rating_average NUMERIC(3,2) DEFAULT 0.00, rating_count INTEGER DEFAULT 0, min_age SMALLINT, max_group_size SMALLINT, difficulty_level VARCHAR(20), is_active BOOLEAN DEFAULT TRUE, is_published BOOLEAN DEFAULT FALSE, managed_by_id UUID, deleted_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ);
CREATE TABLE attraction_tag (attraction_id UUID REFERENCES attraction(id) ON DELETE CASCADE, tag_id UUID REFERENCES tag(id) ON DELETE CASCADE, PRIMARY KEY (attraction_id, tag_id));
CREATE TABLE attraction_inclusion (attraction_id UUID REFERENCES attraction(id) ON DELETE CASCADE, inclusion_item_id UUID REFERENCES inclusion_item(id), type VARCHAR(20) NOT NULL);
CREATE TABLE attraction_media (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), attraction_id UUID REFERENCES attraction(id) ON DELETE CASCADE, media_type_id SMALLINT REFERENCES media_type(id), url TEXT NOT NULL, thumbnail_url TEXT, title VARCHAR(150), is_main BOOLEAN DEFAULT FALSE, sort_order SMALLINT DEFAULT 0, file_size_kb INTEGER, duration_secs INTEGER, created_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE product_option (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), attraction_id UUID REFERENCES attraction(id) ON DELETE CASCADE, slug VARCHAR(150) NOT NULL, title VARCHAR(150) NOT NULL, description TEXT, duration_minutes INTEGER, duration_description VARCHAR(100), cancel_policy_hours INTEGER DEFAULT 24, cancel_policy_text TEXT, max_group_size SMALLINT, min_participants SMALLINT DEFAULT 1, is_active BOOLEAN DEFAULT TRUE, is_private BOOLEAN DEFAULT FALSE, sort_order SMALLINT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ);
CREATE TABLE price_tier (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES product_option(id) ON DELETE CASCADE, ticket_category_id UUID REFERENCES ticket_category(id), price NUMERIC(12,2) NOT NULL, currency_code CHAR(3) DEFAULT 'USD', is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ);

CREATE TABLE tour_itinerary (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), attraction_id UUID REFERENCES attraction(id) ON DELETE CASCADE, title VARCHAR(150) NOT NULL, overview TEXT, total_distance_km NUMERIC(6,2), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ);
CREATE TABLE tour_stop (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), itinerary_id UUID REFERENCES tour_itinerary(id) ON DELETE CASCADE, stop_number SMALLINT NOT NULL, name VARCHAR(150) NOT NULL, description TEXT, duration_minutes SMALLINT, latitude NUMERIC(9,6), longitude NUMERIC(9,6), admission_type VARCHAR(20));
CREATE TABLE tour_stop_media (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), stop_id UUID REFERENCES tour_stop(id) ON DELETE CASCADE, media_type_id SMALLINT REFERENCES media_type(id), url TEXT NOT NULL, sort_order SMALLINT DEFAULT 0);

-- ************************************************************
-- 3. DB_BOOKING (Inventario y Reservas) - SIN CAMBIOS
-- ************************************************************
CREATE TABLE audit_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), correlation_id UUID, table_name VARCHAR(100), record_id UUID, action VARCHAR(10), changed_by VARCHAR(256), changed_at TIMESTAMPTZ DEFAULT NOW(), old_values JSONB, new_values JSONB, ip_address VARCHAR(50), user_agent TEXT, endpoint TEXT);

CREATE TABLE booking_status (id SMALLINT PRIMARY KEY, name VARCHAR(20) NOT NULL UNIQUE);
CREATE TABLE availability_slot (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL, slot_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME, capacity_total SMALLINT NOT NULL, capacity_available SMALLINT NOT NULL, is_active BOOLEAN DEFAULT TRUE, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (product_id, slot_date, start_time));

CREATE TABLE booking (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), correlation_id UUID, pnr_code VARCHAR(8) NOT NULL UNIQUE, user_id UUID NOT NULL, attraction_id UUID, slot_id UUID REFERENCES availability_slot(id), status_id SMALLINT REFERENCES booking_status(id), total_amount NUMERIC(12,2) NOT NULL, currency_code CHAR(3) NOT NULL, notes TEXT, internal_notes TEXT, cancelled_at TIMESTAMPTZ, cancel_reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE booking_detail (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID REFERENCES booking(id) ON DELETE CASCADE, product_option_id UUID, price_tier_id UUID NOT NULL, attraction_name_snapshot VARCHAR(150), option_name_snapshot VARCHAR(150), tier_name_snapshot VARCHAR(100), first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, document_type VARCHAR(20), document_number VARCHAR(50), ticket_category_name VARCHAR(100) NOT NULL, quantity SMALLINT DEFAULT 1, unit_price NUMERIC(12,2) NOT NULL, currency_code CHAR(3) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE review_criteria (id SMALLINT PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE);
CREATE TABLE review (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL UNIQUE REFERENCES booking(id), user_id UUID NOT NULL, attraction_id UUID NOT NULL, overall_score NUMERIC(3,2) NOT NULL, title VARCHAR(255), comment TEXT, response TEXT, responded_at TIMESTAMPTZ, is_visible BOOLEAN DEFAULT TRUE, is_verified BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ);
CREATE TABLE review_rating (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), review_id UUID REFERENCES review(id) ON DELETE CASCADE, criteria_id SMALLINT REFERENCES review_criteria(id), score SMALLINT NOT NULL);
CREATE TABLE review_media (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), review_id UUID REFERENCES review(id) ON DELETE CASCADE, url TEXT NOT NULL, sort_order SMALLINT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());

-- ************************************************************
-- 4. DB_BILLING (Facturación) - SIN CAMBIOS
-- ************************************************************
CREATE TABLE audit_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), correlation_id UUID, table_name VARCHAR(100), record_id UUID, action VARCHAR(10), changed_by VARCHAR(256), changed_at TIMESTAMPTZ DEFAULT NOW(), old_values JSONB, new_values JSONB, ip_address VARCHAR(50), user_agent TEXT, endpoint TEXT);

CREATE TABLE payment_status_type (id SMALLINT PRIMARY KEY, name VARCHAR(20) NOT NULL UNIQUE);
CREATE TABLE payment_method_type (id SMALLINT PRIMARY KEY, name VARCHAR(30) NOT NULL UNIQUE);

CREATE TABLE payment (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), correlation_id UUID, booking_id UUID NOT NULL, transaction_external_id VARCHAR(255), payment_method_id SMALLINT REFERENCES payment_method_type(id), status_id SMALLINT REFERENCES payment_status_type(id), amount NUMERIC(12,2) NOT NULL, currency_code CHAR(3) NOT NULL, gateway_response TEXT, paid_at TIMESTAMPTZ, refunded_at TIMESTAMPTZ, refund_reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE invoice (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL, user_id UUID, invoice_number VARCHAR(30) NOT NULL UNIQUE, customer_name VARCHAR(150) NOT NULL, tax_id VARCHAR(20) NOT NULL, email VARCHAR(100), address TEXT, subtotal NUMERIC(12,2) DEFAULT 0, tax_amount NUMERIC(12,2) DEFAULT 0, total NUMERIC(12,2) NOT NULL, currency_code CHAR(3) DEFAULT 'USD', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE invoice_detail (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id UUID REFERENCES invoice(id) ON DELETE CASCADE, description VARCHAR(255) NOT NULL, quantity INTEGER NOT NULL, unit_price NUMERIC(12,2) NOT NULL, tax_rate NUMERIC(5,2) DEFAULT 0, total_item NUMERIC(12,2) NOT NULL);