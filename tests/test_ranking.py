from app import MusicianProfile, sort_best_flights, sort_best_hotels


def test_flight_ranking_prefers_lower_effective_cost():
    profile = MusicianProfile(
        genre="Rock",
        travelers=4,
        checked_bags=4,
        instruments=3,
        prefers_red_eye=False,
        needs_late_checkout=True,
    )
    flights = [
        {"price": {"total": "330"}, "numberOfBookableSeats": 4},
        {"price": {"total": "310"}, "numberOfBookableSeats": 2},
        {"price": {"total": "350"}, "numberOfBookableSeats": 6},
    ]

    ranked = sort_best_flights(flights, profile)
    assert ranked[0]["price"]["total"] == "330"


def test_hotel_ranking_prefers_lower_price_with_late_checkout_bonus():
    profile = MusicianProfile(
        genre="Jazz",
        travelers=2,
        checked_bags=1,
        instruments=1,
        prefers_red_eye=False,
        needs_late_checkout=True,
    )

    hotels = [
        {"hotel": {"name": "A"}, "offers": [{"price": {"total": "130"}}]},
        {"hotel": {"name": "B"}, "offers": [{"price": {"total": "115"}}]},
    ]

    ranked = sort_best_hotels(hotels, profile)
    assert ranked[0]["hotel"]["name"] == "B"
