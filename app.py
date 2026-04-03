import os
from dataclasses import dataclass
from datetime import date
from typing import Any, Dict, List, Optional


SUPPORTED_COUNTRIES = ["US", "CA"]
MUSIC_GENRES = [
    "Rock",
    "Pop",
    "Hip-Hop",
    "Electronic",
    "Jazz",
    "Classical",
    "Country",
    "Latin",
    "Other",
]


@dataclass
class MusicianProfile:
    genre: str
    travelers: int
    checked_bags: int
    instruments: int
    prefers_red_eye: bool
    needs_late_checkout: bool


class AmadeusClient:
    """Minimal Amadeus API wrapper using self-service APIs."""

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = "https://test.api.amadeus.com"

    def _token(self) -> str:
        import httpx
        with httpx.Client(timeout=15) as client:
            response = client.post(
                f"{self.base_url}/v1/security/oauth2/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
            )
            response.raise_for_status()
            return response.json()["access_token"]

    def search_flights(
        self,
        origin: str,
        destination: str,
        depart_date: date,
        adults: int,
        max_results: int = 10,
    ) -> List[Dict[str, Any]]:
        token = self._token()
        import httpx
        with httpx.Client(timeout=20) as client:
            response = client.get(
                f"{self.base_url}/v2/shopping/flight-offers",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "originLocationCode": origin,
                    "destinationLocationCode": destination,
                    "departureDate": depart_date.isoformat(),
                    "adults": adults,
                    "max": max_results,
                    "currencyCode": "USD",
                },
            )
            response.raise_for_status()
            return response.json().get("data", [])

    def search_hotels(
        self,
        city_code: str,
        check_in: date,
        check_out: date,
        adults: int,
        max_results: int = 10,
    ) -> List[Dict[str, Any]]:
        token = self._token()
        import httpx
        with httpx.Client(timeout=20) as client:
            hotel_list = client.get(
                f"{self.base_url}/v1/reference-data/locations/hotels/by-city",
                headers={"Authorization": f"Bearer {token}"},
                params={"cityCode": city_code},
            )
            hotel_list.raise_for_status()
            hotels = hotel_list.json().get("data", [])[:15]
            hotel_ids = ",".join([h["hotelId"] for h in hotels if "hotelId" in h])
            if not hotel_ids:
                return []

            offers = client.get(
                f"{self.base_url}/v3/shopping/hotel-offers",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "hotelIds": hotel_ids,
                    "adults": adults,
                    "checkInDate": check_in.isoformat(),
                    "checkOutDate": check_out.isoformat(),
                    "bestRateOnly": "true",
                },
            )
            offers.raise_for_status()
            return offers.json().get("data", [])[:max_results]


def mock_flights(origin: str, destination: str) -> List[Dict[str, Any]]:
    return [
        {
            "id": "MOCK1",
            "price": {"total": "285.00", "currency": "USD"},
            "itineraries": [{"duration": "PT6H35M"}],
            "validatingAirlineCodes": ["AC"],
            "numberOfBookableSeats": 6,
            "origin": origin,
            "destination": destination,
        },
        {
            "id": "MOCK2",
            "price": {"total": "319.00", "currency": "USD"},
            "itineraries": [{"duration": "PT4H50M"}],
            "validatingAirlineCodes": ["UA"],
            "numberOfBookableSeats": 4,
            "origin": origin,
            "destination": destination,
        },
    ]


def mock_hotels(city_code: str) -> List[Dict[str, Any]]:
    return [
        {
            "hotel": {"name": f"Backstage Suites {city_code}"},
            "offers": [{"price": {"total": "139.00", "currency": "USD"}}],
        },
        {
            "hotel": {"name": f"Tour Bus Inn {city_code}"},
            "offers": [{"price": {"total": "119.00", "currency": "USD"}}],
        },
    ]


def flight_score(offer: Dict[str, Any], profile: MusicianProfile) -> float:
    price = float(offer.get("price", {}).get("total", 9999))
    seats = offer.get("numberOfBookableSeats", 1)
    seat_bonus = 40 if seats >= profile.travelers else -100
    baggage_penalty = profile.checked_bags * 6 + profile.instruments * 7
    return price + baggage_penalty - seat_bonus


def hotel_score(offer: Dict[str, Any], profile: MusicianProfile) -> float:
    first_offer: Optional[Dict[str, Any]] = (offer.get("offers") or [None])[0]
    if not first_offer:
        return 9999
    nightly = float(first_offer.get("price", {}).get("total", 9999))
    late_checkout_bonus = -15 if profile.needs_late_checkout else 0
    return nightly + late_checkout_bonus


def sort_best_flights(flights: List[Dict[str, Any]], profile: MusicianProfile) -> List[Dict[str, Any]]:
    return sorted(flights, key=lambda x: flight_score(x, profile))


def sort_best_hotels(hotels: List[Dict[str, Any]], profile: MusicianProfile) -> List[Dict[str, Any]]:
    return sorted(hotels, key=lambda x: hotel_score(x, profile))


def render():
    import streamlit as st

    st.set_page_config(page_title="MusicTour AI Agent", page_icon="🎵", layout="wide")
    st.title("🎵 MusicTour AI Travel Agent")
    st.caption("Find flight + hotel deals for musicians across the US and Canada.")

    with st.sidebar:
        st.header("Tour setup")
        origin = st.text_input("Origin airport (IATA)", value="YYZ")
        destination = st.text_input("Destination airport (IATA)", value="LAX")
        hotel_city = st.text_input("Hotel city code", value="LAX")
        depart = st.date_input("Departure", value=date.today())
        check_in = st.date_input("Check-in", value=date.today())
        check_out = st.date_input("Check-out", value=date.today())

        genre = st.selectbox("Genre", MUSIC_GENRES)
        travelers = st.slider("Travelers", 1, 12, 4)
        checked_bags = st.slider("Checked bags", 0, 20, 6)
        instruments = st.slider("Instruments", 0, 20, 4)
        prefers_red_eye = st.toggle("Accept red-eye flights", value=False)
        needs_late_checkout = st.toggle("Need late checkout", value=True)

        target_country = st.selectbox("Tour focus", SUPPORTED_COUNTRIES)
        run_search = st.button("Search best deals")

    st.info(
        "This first release supports Canadian and U.S. itineraries. "
        "Use Amadeus API keys for live results or run in mock mode."
    )

    if not run_search:
        return

    if target_country not in SUPPORTED_COUNTRIES:
        st.error("Only US and Canada are supported in this release.")
        return

    profile = MusicianProfile(
        genre=genre,
        travelers=travelers,
        checked_bags=checked_bags,
        instruments=instruments,
        prefers_red_eye=prefers_red_eye,
        needs_late_checkout=needs_late_checkout,
    )

    client_id = os.getenv("AMADEUS_CLIENT_ID")
    client_secret = os.getenv("AMADEUS_CLIENT_SECRET")

    try:
        if client_id and client_secret:
            api = AmadeusClient(client_id, client_secret)
            flights = api.search_flights(origin, destination, depart, travelers)
            hotels = api.search_hotels(hotel_city, check_in, check_out, travelers)
            st.success("Live deals loaded from Amadeus test APIs.")
        else:
            flights = mock_flights(origin, destination)
            hotels = mock_hotels(hotel_city)
            st.warning("Using mock deals. Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET for live data.")
    except Exception as exc:
        flights = mock_flights(origin, destination)
        hotels = mock_hotels(hotel_city)
        st.warning(f"Live search failed: {exc}. Showing mock results.")

    best_flights = sort_best_flights(flights, profile)[:5]
    best_hotels = sort_best_hotels(hotels, profile)[:5]

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Best Flight Deals")
        for idx, flight in enumerate(best_flights, start=1):
            price = flight.get("price", {}).get("total", "N/A")
            currency = flight.get("price", {}).get("currency", "USD")
            airline = ", ".join(flight.get("validatingAirlineCodes", ["N/A"]))
            duration = (flight.get("itineraries") or [{}])[0].get("duration", "N/A")
            st.markdown(
                f"**#{idx} {airline}**  "+
                f"Price: `{currency} {price}` | Duration: `{duration}`"
            )

    with col2:
        st.subheader("Best Hotel Deals")
        for idx, hotel in enumerate(best_hotels, start=1):
            name = hotel.get("hotel", {}).get("name", "Unknown hotel")
            first_offer = (hotel.get("offers") or [{}])[0]
            price = first_offer.get("price", {}).get("total", "N/A")
            currency = first_offer.get("price", {}).get("currency", "USD")
            st.markdown(f"**#{idx} {name}**  \nPrice: `{currency} {price}`")


if __name__ == "__main__":
    render()
