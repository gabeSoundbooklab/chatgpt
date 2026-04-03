const GENRES = ["Rock", "Pop", "Hip-Hop", "Electronic", "Jazz", "Classical", "Country", "Latin", "Other"];

const AIRPORTS = [
  { code: "ATL", city: "Atlanta", country: "US" }, { code: "LAX", city: "Los Angeles", country: "US" },
  { code: "ORD", city: "Chicago", country: "US" }, { code: "DFW", city: "Dallas", country: "US" },
  { code: "DEN", city: "Denver", country: "US" }, { code: "JFK", city: "New York", country: "US" },
  { code: "SFO", city: "San Francisco", country: "US" }, { code: "SEA", city: "Seattle", country: "US" },
  { code: "LAS", city: "Las Vegas", country: "US" }, { code: "MCO", city: "Orlando", country: "US" },
  { code: "MIA", city: "Miami", country: "US" }, { code: "BOS", city: "Boston", country: "US" },
  { code: "CLT", city: "Charlotte", country: "US" }, { code: "PHX", city: "Phoenix", country: "US" },
  { code: "IAH", city: "Houston", country: "US" }, { code: "MSP", city: "Minneapolis", country: "US" },
  { code: "DTW", city: "Detroit", country: "US" }, { code: "PHL", city: "Philadelphia", country: "US" },
  { code: "EWR", city: "Newark", country: "US" }, { code: "SAN", city: "San Diego", country: "US" },
  { code: "YYZ", city: "Toronto", country: "CA" }, { code: "YVR", city: "Vancouver", country: "CA" },
  { code: "YUL", city: "Montreal", country: "CA" }, { code: "YYC", city: "Calgary", country: "CA" },
  { code: "YOW", city: "Ottawa", country: "CA" }, { code: "YEG", city: "Edmonton", country: "CA" },
  { code: "YWG", city: "Winnipeg", country: "CA" }, { code: "YHZ", city: "Halifax", country: "CA" },
  { code: "YQB", city: "Quebec City", country: "CA" }, { code: "YXE", city: "Saskatoon", country: "CA" },
  { code: "YQR", city: "Regina", country: "CA" }, { code: "YYT", city: "St. John's", country: "CA" }
];

const els = {
  genre: document.getElementById("genre"),
  origin: document.getElementById("origin"),
  destination: document.getElementById("destination"),
  departDate: document.getElementById("departDate"),
  returnDate: document.getElementById("returnDate"),
  checkInDate: document.getElementById("checkInDate"),
  checkOutDate: document.getElementById("checkOutDate"),
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
  statusText: document.getElementById("statusText"),
  itemTemplate: document.getElementById("itemTemplate")
};

function init() {
  GENRES.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    els.genre.appendChild(option);
  });

  populateAirports(els.origin, "YYZ");
  populateAirports(els.destination, "LAX");
  setDefaultDates();

  els.searchBtn.addEventListener("click", runSearch);
  runSearch();
}

function setDefaultDates() {
  const now = new Date();
  const plusDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  els.departDate.value = plusDays(30);
  els.returnDate.value = plusDays(34);
  els.checkInDate.value = plusDays(30);
  els.checkOutDate.value = plusDays(34);
}

function populateAirports(selectEl, defaultCode) {
  selectEl.innerHTML = "";
  AIRPORTS.forEach((airport) => {
    const option = document.createElement("option");
    option.value = airport.code;
    option.textContent = `${airport.code} — ${airport.city}, ${airport.country}`;
    if (airport.code === defaultCode) option.selected = true;
    selectEl.appendChild(option);
  });
}

function flightScore(offer, p) {
  const price = Number.isFinite(offer.price) ? offer.price : 100000;
  const baggagePenalty = p.bags * 6 + p.instruments * 7;
  return price + baggagePenalty;
}

function hotelScore(offer, p) {
  const price = Number.isFinite(offer.price) ? offer.price : 100000;
  return price + (p.lateCheckout ? -15 : 0);
}

function parsePrice(text) {
  const match = text.replace(/,/g, "").match(/\$\s?(\d{2,5})(?:\.\d{2})?/);
  return match ? Number(match[1]) : null;
}

async function fetchOfferPreview(url) {
  const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(proxied);
    if (!res.ok) return { price: null, ok: false };
    const text = await res.text();
    return { price: parsePrice(text), ok: true };
  } catch {
    return { price: null, ok: false };
  }
}

function buildFlightSites(p) {
  const d = p.departDate;
  const r = p.returnDate;
  return [
    { source: "Google Flights", url: `https://www.google.com/travel/flights?hl=en#flt=${p.origin}.${p.destination}.${d}*${p.destination}.${p.origin}.${r};c:USD;e:1;sd:1;t:f` },
    { source: "Kayak", url: `https://www.kayak.com/flights/${p.origin}-${p.destination}/${d}/${r}?sort=bestflight_a` },
    { source: "Skyscanner", url: `https://www.skyscanner.com/transport/flights/${p.origin.toLowerCase()}/${p.destination.toLowerCase()}/${d.replaceAll('-', '')}/${r.replaceAll('-', '')}/` },
    { source: "Expedia", url: `https://www.expedia.com/Flights-Search?trip=roundtrip&leg1=from:${p.origin},to:${p.destination},departure:${d}TANYT&leg2=from:${p.destination},to:${p.origin},departure:${r}TANYT&passengers=adults:${p.travelers}` }
  ];
}

function buildHotelSites(p) {
  const city = AIRPORTS.find((a) => a.code === p.destination)?.city || p.destination;
  return [
    { source: "Booking.com", url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${p.checkInDate}&checkout=${p.checkOutDate}&group_adults=${p.travelers}` },
    { source: "Hotels.com", url: `https://www.hotels.com/Hotel-Search?destination=${encodeURIComponent(city)}&startDate=${p.checkInDate}&endDate=${p.checkOutDate}&adults=${p.travelers}` },
    { source: "Expedia Hotels", url: `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(city)}&startDate=${p.checkInDate}&endDate=${p.checkOutDate}&adults=${p.travelers}` },
    { source: "Kayak Hotels", url: `https://www.kayak.com/hotels/${encodeURIComponent(city)},United-States-c${p.destination}?checkin=${p.checkInDate}&checkout=${p.checkOutDate}` }
  ];
}

async function runSearch() {
  const profile = readProfile();
  els.searchBtn.disabled = true;
  els.statusText.textContent = "Checking real travel websites…";

  const flights = buildFlightSites(profile);
  const hotels = buildHotelSites(profile);

  const flightPreviews = await Promise.all(flights.map(async (site) => {
    const preview = await fetchOfferPreview(site.url);
    return { ...site, price: preview.price, score: flightScore({ price: preview.price }, profile) };
  }));

  const hotelPreviews = await Promise.all(hotels.map(async (site) => {
    const preview = await fetchOfferPreview(site.url);
    return { ...site, price: preview.price, score: hotelScore({ price: preview.price }, profile) };
  }));

  const rankedFlights = flightPreviews.sort((a, b) => a.score - b.score);
  const rankedHotels = hotelPreviews.sort((a, b) => a.score - b.score);

  renderSummary(profile, rankedFlights, rankedHotels);
  renderResults(els.flightResults, rankedFlights, "flight");
  renderResults(els.hotelResults, rankedHotels, "hotel");

  els.statusText.textContent = "Done. Open links to confirm the latest live prices directly on each website.";
  els.searchBtn.disabled = false;
}

function readProfile() {
  return {
    country: els.country.value,
    genre: els.genre.value,
    origin: els.origin.value,
    destination: els.destination.value,
    departDate: els.departDate.value,
    returnDate: els.returnDate.value,
    checkInDate: els.checkInDate.value,
    checkOutDate: els.checkOutDate.value,
    travelers: Number(els.travelers.value || 1),
    bags: Number(els.bags.value || 0),
    instruments: Number(els.instruments.value || 0),
    redeye: els.redeye.checked,
    lateCheckout: els.lateCheckout.checked
  };
}

function renderSummary(profile, flights, hotels) {
  const f = flights[0];
  const h = hotels[0];
  els.summaryCard.innerHTML = `
    <h2>Deal Summary</h2>
    <p class="muted">${profile.genre} tour · ${profile.country} focus · ${profile.travelers} travelers</p>
    <div class="list">
      <article class="result-item">
        <div>
          <h3>Top Flight Site</h3>
          <p class="meta">${f.source} · ${profile.origin} → ${profile.destination}</p>
        </div>
        <div class="price">${formatPrice(f.price)}</div>
      </article>
      <article class="result-item">
        <div>
          <h3>Top Hotel Site</h3>
          <p class="meta">${h.source} · ${profile.destination}</p>
        </div>
        <div class="price">${formatPrice(h.price)}</div>
      </article>
    </div>`;
}

function renderResults(targetEl, offers, kind) {
  targetEl.innerHTML = "";
  offers.forEach((offer, index) => {
    const row = els.itemTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector("h3").textContent = `#${index + 1} ${offer.source}`;
    row.querySelector(".meta").textContent = kind === "flight" ? "Flight search offer" : "Hotel search offer";
    row.querySelector(".price").textContent = formatPrice(offer.price);

    const link = row.querySelector(".deal-link");
    link.href = offer.url;
    link.textContent = `Open ${offer.source} ↗`;

    targetEl.appendChild(row);
  });
}

function formatPrice(value) {
  return Number.isFinite(value) ? `$${value}` : "Price on click";
}

init();
