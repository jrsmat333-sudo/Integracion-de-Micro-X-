import { ApolloClient, InMemoryCache, createHttpLink, gql } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getToken } from './api';

const GATEWAY_GRAPHQL = 'https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/graphql';

const httpLink = createHttpLink({
  uri: GATEWAY_GRAPHQL,
});

const authLink = setContext(async (_, { headers }) => {
  const token = await getToken();
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

export const GET_ATTRACTIONS = gql`
  query GetAttractions($search: String, $page: Int, $pageSize: Int) {
    attractions(search: $search, page: $page, pageSize: $pageSize) {
      id
      slug
      name
      descriptionShort
      imageUrl
      locationName
      ratingAverage
      ratingCount
      startingPrice
      currencyCode
      difficultyLevel
      isActive
      isPublished
    }
  }
`;

export const GET_ATTRACTION_DETAIL = gql`
  query GetAttraction($slug: String!) {
    attraction(slug: $slug) {
      id
      slug
      name
      descriptionShort
      descriptionFull
      imageUrl
      locationName
      ratingAverage
      ratingCount
      difficultyLevel
      minAge
      maxGroupSize
      address
      meetingPoint
      products {
        id
        title
        description
        durationMinutes
        priceTiers {
          id
          categoryName
          price
          currencyCode
        }
      }
      slots {
        fecha
        cuposDisponibles
        productOptionId
        horarios {
          slotId
          horaInicio
          horaFin
          cuposDisponibles
          cuposTotales
        }
      }
    }
  }
`;

export const GET_MY_BOOKINGS = gql`
  query GetMyBookings {
    myBookings {
      bookingId
      pnrCode
      status
      totalAmount
      currency
      activityDate
      attractionName
      attractionImage
      totalPassengers
    }
  }
`;
