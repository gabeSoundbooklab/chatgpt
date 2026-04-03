const GENRES = ["Rock", "Pop", "Hip-Hop", "Electronic", "Jazz", "Classical", "Country", "Latin", "Other"];

const MOCK_FLIGHTS = [
  { id: "F1", airline: "AC", from: "YYZ", to: "LAX", duration: "6h 35m", price: 285, seats: 6 },
  { id: "F2", airline: "UA", from: "YYZ", to: "LAX", duration: "4h 50m", price: 319, seats: 4 },
  { id: "F3", airline: "WS", from: "YYZ", to: "LAX", duration: "5h 10m", price: 301, seats: 2 },
  { id: "F4", airline: "DL", from: "YYZ", to: "LAX", duration: "5h 20m", price: 342, seats: 8 }
];

const MOCK_HOTELS = [
  { id: "H1", name: "Tour Bus Inn", nightly: 119, rating: 4.1 },
  { id: "H2", name: "Backstage Suites", nightly: 139, rating: 4.5 },
  { id: "H3", name: "Soundcheck Stay", nightly: 129, rating: 4.3 },
  { id: "H4", name: "Encore Residence", nightly: 149, rating: 4.7 }
];

const els = {
  genre: document.getElementById("genre"),
  origin: document.getElementById("origin"),
  destination: document.getElementById("destination"),
  hotelCity: document.getElementById("hotelCity"),
  country: document.getElementById("country"),
  travelers: document.getElementById("travelers"),
  bags: document.getElementById("bags"),
  instruments: document.getElementById("instruments"),
  redeye: document.getElementById("redeye"),
  lateCheckout: document.getElementById("lateCheckout"),
  flightResults: document.getElementById("flightResults"),
  hotelResults: document.getElementById("hotelResults"),
  summaryCard: document.getElementById("summaryCard"),
  searchBtn: document.getElementById("searchBtn"),
  itemTemplate: document.getElementById("itemTemplate")
};

function init() {
  GENRES.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    els.genre.appendChild(option);
  });

  els.searchBtn.addEventListener("click", runSearch);
  runSearch();
}

function flightScore(flight, p) {
  const seatBonus = flight.seats >= p.travelers ? 40 : -100;
  const baggagePenalty = p.bags * 6 + p.instruments * 7;
  const redeyePenalty = p.redeye ? 0 : (flight.duration.includes("6h") ? 10 : 0);
  return flight.price + baggagePenalty - seatBonus + redeyePenalty;
}

function hotelScore(hotel, p) {
  const lateCheckoutBonus = p.lateCheckout ? -15 : 0;
  const qualityBonus = hotel.rating * -4;
  return hotel.nightly + lateCheckoutBonus + qualityBonus;
}

function runSearch() {
  const profile = readProfile();
  if (!["US", "CA"].includes(profile.country)) {
    window.alert("Only US and Canada are supported in this release.");
    return;
  }

  const flights = MOCK_FLIGHTS
    .map((f) => ({ ...f, from: profile.origin, to: profile.destination }))
    .sort((a, b) => flightScore(a, profile) - flightScore(b, profile))
    .slice(0, 5);

  const hotels = MOCK_HOTELS
    .map((h) => ({ ...h, city: profile.hotelCity }))
    .sort((a, b) => hotelScore(a, profile) - hotelScore(b, profile))
    .slice(0, 5);

  renderSummary(profile, flights, hotels);
  renderFlightResults(flights);
  renderHotelResults(hotels);
}

function readProfile() {
  return {
    country: els.country.value,
    genre: els.genre.value,
    origin: els.origin.value.toUpperCase().trim(),
    destination: els.destination.value.toUpperCase().trim(),
    hotelCity: els.hotelCity.value.toUpperCase().trim(),
    travelers: Number(els.travelers.value || 1),
    bags: Number(els.bags.value || 0),
    instruments: Number(els.instruments.value || 0),
    redeye: els.redeye.checked,
    lateCheckout: els.lateCheckout.checked
  };
}

function renderSummary(profile, flights, hotels) {
  els.summaryCard.innerHTML = `
    <h2>Deal Summary</h2>
    <p class="muted">${profile.genre} tour · ${profile.country} focus · ${profile.travelers} travelers</p>
    <div class="list">
      <article class="result-item">
        <div>
          <h3>Top Flight</h3>
          <p class="meta">${flights[0].airline} · ${flights[0].from} → ${flights[0].to} · ${flights[0].duration}</p>
        </div>
        <div class="price">$${flights[0].price}</div>
      </article>
      <article class="result-item">
        <div>
          <h3>Top Hotel</h3>
          <p class="meta">${hotels[0].name} · ${hotels[0].city} · ${hotels[0].rating.toFixed(1)}★</p>
        </div>
        <div class="price">$${hotels[0].nightly}</div>
      </article>
    </div>`;
}

function renderFlightResults(flights) {
  els.flightResults.innerHTML = "";
  flights.forEach((flight, index) => {
    const row = createItem(
      `#${index + 1} ${flight.airline} · ${flight.from} → ${flight.to}`,
      `${flight.duration} · ${flight.seats} seats`,
      `$${flight.price}`
    );
    els.flightResults.appendChild(row);
  });
}

function renderHotelResults(hotels) {
  els.hotelResults.innerHTML = "";
  hotels.forEach((hotel, index) => {
    const row = createItem(
      `#${index + 1} ${hotel.name}`,
      `${hotel.city} · ${hotel.rating.toFixed(1)}★`,
      `$${hotel.nightly}`
    );
    els.hotelResults.appendChild(row);
  });
}

function createItem(title, meta, price) {
  const node = els.itemTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector("h3").textContent = title;
  node.querySelector(".meta").textContent = meta;
  node.querySelector(".price").textContent = price;
  return node;
}

init();
