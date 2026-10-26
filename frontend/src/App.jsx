
import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = "https://movietime-9w98.onrender.com/api/movies/";
const SHOWS_URL = "https://movietime-9w98.onrender.com/api/shows/";
const BOOKING_URL = "https://movietime-9w98.onrender.com/api/bookings/create/";
const BOOKINGS_URL = "https://movietime-9w98.onrender.com/api/bookings/";
const BOOKED_SEATS_URL = "https://movietime-9w98.onrender.com/api/booked-seats/";
const REGISTER_URL = "https://movietime-9w98.onrender.com/api/register/";
const LOGIN_URL = "https://movietime-9w98.onrender.com/api/login/";
const CURRENT_USER_URL = "https://movietime-9w98.onrender.com/api/me/";
const LOGOUT_URL = "https://movietime-9w98.onrender.com/api/logout/";
const ADMIN_DASHBOARD_URL = "https://movietime-9w98.onrender.com/api/admin-dashboard/";

function App() {
  const [movies, setMovies] = useState([]);
  const [shows, setShows] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookedSeatsForShow, setBookedSeatsForShow] = useState([]);
  const [seatAvailability, setSeatAvailability] = useState({
    showId: null,
    status: "idle",
    error: "",
  });
  const selectedShowRef = useRef(null);
  const seatAvailabilityRequestId = useRef(0);

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedShow, setSelectedShow] = useState(null);
  const [selectedShowDate, setSelectedShowDate] = useState("All");
  const [selectedSeats, setSelectedSeats] = useState([]);

  const [message, setMessage] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  const [authMode, setAuthMode] = useState(null);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [loggedInUsername, setLoggedInUsername] = useState("");

  const [showMyBookings, setShowMyBookings] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");

  // ADMIN DASHBOARD STATE
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminDashboard, setAdminDashboard] = useState(null);
  const [adminDashboardLoading, setAdminDashboardLoading] = useState(false);
  const [adminDashboardError, setAdminDashboardError] = useState("");

  function updateSelectedShow(show) {
    selectedShowRef.current = show;
    setSelectedShow(show);
  }

  function clearBookedSeatAvailability() {
    seatAvailabilityRequestId.current += 1;
    setBookedSeatsForShow([]);
    setSeatAvailability({
      showId: null,
      status: "idle",
      error: "",
    });
  }

  // LOAD BOOKINGS FOR THE LOGGED-IN USER
  async function loadBookings() {
    const response = await fetch(BOOKINGS_URL, {
      credentials: "include",
    });

    if (response.status === 401) {
      setBookings([]);
      return [];
    }

    if (!response.ok) {
      throw new Error("Bookings API failed");
    }

    const data = await response.json();
    const bookingData = Array.isArray(data) ? data : [];

    setBookings(bookingData);
    return bookingData;
  }

  // LOAD ALL BOOKED SEATS FOR A SHOW
  async function loadBookedSeats(showId) {
    if (!showId) {
      clearBookedSeatAvailability();
      return [];
    }

    if (Number(selectedShowRef.current?.id) !== Number(showId)) {
      return [];
    }

    const requestId = ++seatAvailabilityRequestId.current;
    setBookedSeatsForShow([]);
    setSeatAvailability({
      showId,
      status: "loading",
      error: "",
    });

    try {
      const response = await fetch(
        `${BOOKED_SEATS_URL}?show_id=${encodeURIComponent(showId)}`
      );

      if (!response.ok) {
        throw new Error("Could not load booked seats. Please try again.");
      }

      const data = await response.json();
      if (!Array.isArray(data?.booked_seats)) {
        throw new Error("Booked seats response was invalid. Please retry.");
      }

      const seats = data.booked_seats;

      if (
        requestId === seatAvailabilityRequestId.current &&
        Number(selectedShowRef.current?.id) === Number(showId)
      ) {
        setBookedSeatsForShow(seats);
        setSeatAvailability({
          showId,
          status: "loaded",
          error: "",
        });
      }

      return seats;
    } catch (error) {
      if (
        requestId === seatAvailabilityRequestId.current &&
        Number(selectedShowRef.current?.id) === Number(showId)
      ) {
        setBookedSeatsForShow([]);
        setSeatAvailability({
          showId,
          status: "error",
          error:
            error instanceof TypeError
              ? "Could not connect to the server while loading seat availability. Please retry."
              : error.message || "Could not load booked seats.",
        });
      }

      throw error;
    }
  }

  // LOAD ADMIN DASHBOARD STATISTICS
  async function loadAdminDashboard() {
    setAdminDashboardLoading(true);
    setAdminDashboardError("");
    setAdminDashboard(null);

    try {
      const response = await fetch(ADMIN_DASHBOARD_URL, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          throw new Error(
            "Admin access required. Please log in using your Django staff account."
          );
        }

        throw new Error(
          data.error || "Could not load admin dashboard."
        );
      }

      setAdminDashboard(data);
    } catch (error) {
      console.error("Admin dashboard error:", error);
      setAdminDashboardError(
        error.message || "Could not connect to the Django server."
      );
    } finally {
      setAdminDashboardLoading(false);
    }
  }

  // OPEN ADMIN DASHBOARD
  async function openAdminDashboard() {
    if (!loggedInUsername) {
      setAuthMode("login");
      setAuthMessage("Please log in with your Django staff account.");
      return;
    }

    setShowMyBookings(false);
    setShowAdminDashboard(true);
    setSelectedMovie(null);
    updateSelectedShow(null);
    setSelectedSeats([]);
    clearBookedSeatAvailability();
    setAuthMode(null);
    setMessage("");

    window.history.pushState({}, "", "/admin-dashboard/");
    window.scrollTo({ top: 0, behavior: "smooth" });

    await loadAdminDashboard();
  }

  // REFRESH ADMIN DASHBOARD
  async function refreshAdminDashboard() {
    await loadAdminDashboard();
  }

  // LOGIN AND REGISTRATION
  async function submitAuth(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");

    const endpoint =
      authMode === "register" ? REGISTER_URL : LOGIN_URL;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthMessage(
          data.error || "Request failed. Please try again."
        );
        return;
      }

      if (authMode === "register") {
        setAuthMode("login");
        setAuthPassword("");
        setAuthMessage(
          "Registration successful! Please log in."
        );
        return;
      }

      const userResponse = await fetch(CURRENT_USER_URL, {
        credentials: "include",
      });

      const userData = await userResponse.json();

      if (!userResponse.ok || !userData.authenticated) {
        setLoggedInUsername("");
        setAuthMessage(
          "Login session was not saved. Please try again."
        );
        return;
      }

      setLoggedInUsername(userData.username);
      setAuthMode(null);
      setAuthUsername("");
      setAuthPassword("");
      setAuthMessage("");
      setMessage("");

      try {
        await loadBookings();
      } catch (bookingError) {
        console.error("Could not load bookings:", bookingError);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setAuthMessage(
        "Could not connect to Django. Check the backend server."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  // LOGOUT
  async function handleLogout() {
    try {
      const response = await fetch(LOGOUT_URL, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Logout failed.");
        return;
      }

      setLoggedInUsername("");
      setAuthMode(null);
      setAuthUsername("");
      setAuthPassword("");
      setSelectedSeats([]);
      setSelectedMovie(null);
      updateSelectedShow(null);
      clearBookedSeatAvailability();
      setShowMyBookings(false);
      setShowAdminDashboard(false);
      setBookings([]);
      setAdminDashboard(null);
      setAdminDashboardError("");
      setMessage("");
      setBookingsError("");

      window.history.pushState({}, "", "/");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Logout error:", error);
      setMessage("Could not connect to Django to log out.");
    }
  }

  // OPEN MY BOOKINGS PAGE
  async function openMyBookings() {
    if (!loggedInUsername) {
      setAuthMode("login");
      setAuthMessage("Please log in to view your bookings.");
      return;
    }

    setAuthMode(null);
    setShowAdminDashboard(false);
    setSelectedMovie(null);
    updateSelectedShow(null);
    setSelectedSeats([]);
    clearBookedSeatAvailability();
    setShowMyBookings(true);
    setBookingsLoading(true);
    setBookingsError("");
    setMessage("");

    window.history.pushState({}, "", "/my-bookings/");
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      await loadBookings();
    } catch (error) {
      console.error("My bookings error:", error);
      setBookingsError(
        "Could not load bookings. Please check the Django server."
      );
    } finally {
      setBookingsLoading(false);
    }
  }

  // RETURN TO HOMEPAGE
  function goHome() {
    setSelectedMovie(null);
    updateSelectedShow(null);
    setSelectedSeats([]);
    clearBookedSeatAvailability();
    setShowMyBookings(false);
    setShowAdminDashboard(false);
    setAdminDashboardError("");
    setAuthMode(null);
    setAuthMessage("");
    setMessage("");
    setBookingsError("");

    window.history.pushState({}, "", "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // LOAD MOVIES AND SHOWS
  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [movieResponse, showResponse] = await Promise.all([
          fetch(API_URL),
          fetch(SHOWS_URL),
        ]);

        if (!movieResponse.ok || !showResponse.ok) {
          throw new Error("Movies or shows API failed");
        }

        const [movieData, showData] = await Promise.all([
          movieResponse.json(),
          showResponse.json(),
        ]);

        if (!active) return;

        setMovies(Array.isArray(movieData) ? movieData : []);
        setShows(Array.isArray(showData) ? showData : []);
      } catch (error) {
        console.error("Initial loading error:", error);

        if (active) {
          setError(
            "Could not load movies or shows. Check the Django server."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    async function loadUserData() {
      let username = "";

      try {
        const userResponse = await fetch(CURRENT_USER_URL, {
          credentials: "include",
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          username = userData.authenticated ? userData.username : "";
        }
      } catch (error) {
        console.error("Current user loading error:", error);
      }

      if (!active) return;

      setLoggedInUsername(username);

      if (!username) {
        setBookings([]);
        return;
      }

      try {
        const bookingResponse = await fetch(BOOKINGS_URL, {
          credentials: "include",
        });

        if (bookingResponse.ok) {
          const bookingData = await bookingResponse.json();

          if (active) {
            setBookings(Array.isArray(bookingData) ? bookingData : []);
          }
        } else if (bookingResponse.status === 401 && active) {
          setBookings([]);
        }
      } catch (error) {
        console.error("Bookings loading error:", error);
      }
    }

    loadUserData();
    loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  // MOVIE SEARCH AND LANGUAGE FILTER
  const filteredMovies = movies.filter((movie) => {
    const matchesSearch = (movie.title || "")
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesLanguage =
      language === "All" ||
      (movie.language || "").toLowerCase() ===
        language.toLowerCase();

    return matchesSearch && matchesLanguage;
  });

  // SHOWS FOR SELECTED MOVIE
  const movieShows = selectedMovie
    ? shows.filter(
        (show) => show.movie_title === selectedMovie.title
      )
    : [];

  // SHOW DATE KEYS USE THE THEATRE'S LOCAL TIMEZONE
  function getShowDateKey(showTime) {
    const date = new Date(showTime);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const dateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const parts = Object.fromEntries(
      dateParts.map(({ type, value }) => [type, value])
    );

    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  const movieShowDates = [
    ...new Set(
      movieShows
        .map((show) => getShowDateKey(show.show_time))
        .filter(Boolean)
    ),
  ].sort();

  const filteredMovieShows = movieShows
    .filter(
      (show) =>
        selectedShowDate === "All" ||
        getShowDateKey(show.show_time) === selectedShowDate
    )
    .sort((first, second) => {
      const firstTime = new Date(first.show_time).getTime();
      const secondTime = new Date(second.show_time).getTime();

      if (Number.isNaN(firstTime) && Number.isNaN(secondTime)) return 0;
      if (Number.isNaN(firstTime)) return 1;
      if (Number.isNaN(secondTime)) return -1;
      return firstTime - secondTime;
    });

  // BOOKED SEATS FOR THE SELECTED SHOW
  const bookedSeats = selectedShow ? bookedSeatsForShow : [];
  const isSeatAvailabilityLoaded =
    selectedShow &&
    Number(seatAvailability.showId) === Number(selectedShow.id) &&
    seatAvailability.status === "loaded";

  // OPEN MOVIE BOOKING PAGE
  function openBooking(movie) {
    setSelectedMovie(movie);
    updateSelectedShow(null);
    setSelectedShowDate("All");
    setSelectedSeats([]);
    clearBookedSeatAvailability();
    setShowMyBookings(false);
    setShowAdminDashboard(false);
    setAuthMode(null);
    setMessage("");

    window.history.pushState({}, "", `/booking/${movie.id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // CLOSE MOVIE BOOKING PAGE
  function closeBooking() {
    setSelectedMovie(null);
    updateSelectedShow(null);
    setSelectedSeats([]);
    clearBookedSeatAvailability();
    setMessage("");

    window.history.pushState({}, "", "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // SELECT OR DESELECT SEAT
  function toggleSeat(seat) {
    if (!isSeatAvailabilityLoaded) {
      setMessage("Seat availability is not ready. Please retry loading seats.");
      return;
    }

    if (!loggedInUsername) {
      setMessage("Please log in before selecting seats.");
      setAuthMode("login");
      setAuthMessage("Please log in to continue booking.");
      return;
    }

    if (bookedSeats.includes(seat)) {
      setMessage(
        `Seat ${seat} is already booked. Please choose another seat.`
      );
      return;
    }

    setMessage("");

    setSelectedSeats((previous) =>
      previous.includes(seat)
        ? previous.filter((item) => item !== seat)
        : [...previous, seat]
    );
  }

  // CONFIRM BOOKING
  async function confirmBooking() {
    if (!loggedInUsername) {
      setMessage("Please log in before booking tickets.");
      setAuthMode("login");
      setAuthMessage("Please log in to continue booking.");
      return;
    }

    if (!selectedShow) {
      setMessage("Please select a show.");
      return;
    }

    if (!isSeatAvailabilityLoaded) {
      setMessage("Seat availability is not ready. Please retry loading seats.");
      return;
    }

    if (selectedSeats.length === 0) {
      setMessage("Please select at least one available seat.");
      return;
    }

    setBookingLoading(true);
    setMessage("Booking in progress...");

    try {
      const response = await fetch(BOOKING_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          show_id: selectedShow.id,
          seats: selectedSeats,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error || "Booking failed. Please try again."
        );

        try {
          await loadBookedSeats(selectedShow.id);
        } catch (seatError) {
          console.error("Booked seats refresh error:", seatError);
        }

        try {
          await loadBookings();
        } catch (bookingError) {
          console.error("Bookings refresh error:", bookingError);
        }

        setSelectedSeats([]);
        return;
      }

      const bookedSeatNames = Array.isArray(data.seats)
        ? data.seats.join(", ")
        : selectedSeats.join(", ");

      setMessage(
        `Booking successful! Movie: ${
          data.movie || selectedMovie.title
        } | Theatre: ${
          data.theatre || selectedShow.theatre
        } | Seats: ${bookedSeatNames} | Total: ₹${
          data.total_amount ?? "N/A"
        }`
      );

      setSelectedSeats([]);

      try {
        await loadBookedSeats(selectedShow.id);
      } catch (seatError) {
        console.error("Booked seats refresh error:", seatError);
      }
      await loadBookings();
    } catch (error) {
      console.error("Booking error:", error);
      setMessage(
        "Could not connect to Django server. Please check both servers."
      );
    } finally {
      setBookingLoading(false);
    }
  }

  // FORMAT DATE AND TIME
  function formatDateTime(value) {
    if (!value) return "Date not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    });
  }

  // MY BOOKINGS PAGE
  function renderMyBookings() {
    return (
      <section className="movies-section booking-section">
        <button className="back-button" onClick={goHome}>
          ← Back to movies
        </button>

        <p className="eyebrow">YOUR TICKETS</p>
        <h2>My Bookings</h2>

        <p className="status">
          Welcome, {loggedInUsername}. Here are your bookings.
        </p>

        {bookingsLoading && (
          <p className="status">Loading your bookings...</p>
        )}

        {bookingsError && (
          <p className="status error">{bookingsError}</p>
        )}

        {!bookingsLoading &&
          !bookingsError &&
          bookings.length === 0 && (
            <div className="empty-bookings">
              <h3>No bookings yet</h3>
              <p>
                You haven't booked any movie tickets yet.
                Explore movies and book your first ticket!
              </p>

              <button className="book-button" onClick={goHome}>
                Explore Movies
              </button>
            </div>
          )}

        {!bookingsLoading &&
          !bookingsError &&
          bookings.length > 0 && (
            <div className="my-bookings-list">
              {bookings.map((booking, index) => {
                const movieName =
                  booking.movie_title ||
                  booking.movie ||
                  booking.title ||
                  "Movie";

                const theatreName =
                  booking.theatre ||
                  booking.theatre_name ||
                  "Theatre not available";

                const showTime =
                  booking.show_time ||
                  booking.show_datetime ||
                  booking.datetime;

                const seatNumber =
                  booking.seat_number ||
                  booking.seat ||
                  "Not available";

                const ticketPrice =
                  booking.price ??
                  booking.ticket_price ??
                  booking.amount;

                const bookingId =
                  booking.id ?? booking.booking_id ?? index + 1;

                return (
                  <article
                    className="booking-card"
                    key={booking.id ?? `${bookingId}-${index}`}
                  >
                    <div className="booking-card-heading">
                      <div>
                        <p className="eyebrow">MOVIETIME TICKET</p>
                        <h3>{movieName}</h3>
                      </div>

                      <span className="booking-status">Booked</span>
                    </div>

                    <div className="booking-details">
                      <p>
                        <strong>Booking ID:</strong> {bookingId}
                      </p>

                      <p>
                        <strong>Theatre:</strong> {theatreName}
                      </p>

                      <p>
                        <strong>Show time:</strong>{" "}
                        {formatDateTime(showTime)}
                      </p>

                      <p>
                        <strong>Seat:</strong> {seatNumber}
                      </p>

                      {ticketPrice !== undefined &&
                        ticketPrice !== null && (
                          <p>
                            <strong>Price:</strong> ₹{ticketPrice}
                          </p>
                        )}

                      {booking.booked_at && (
                        <p>
                          <strong>Booked on:</strong>{" "}
                          {formatDateTime(booking.booked_at)}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </section>
    );
  }

  // ADMIN DASHBOARD PAGE
  function renderAdminDashboard() {
    return (
      <section className="movies-section booking-section">
        <button className="back-button" onClick={goHome}>
          ← Back to movies
        </button>

        <p className="eyebrow">MOVIETIME MANAGEMENT</p>
        <h2>Admin Dashboard</h2>

        <p className="status">
          Welcome, {loggedInUsername}. Here is your current overview.
        </p>

        <button
          className="book-button"
          type="button"
          onClick={refreshAdminDashboard}
          disabled={adminDashboardLoading}
          style={{ marginBottom: "24px" }}
        >
          {adminDashboardLoading ? "Refreshing..." : "Refresh Dashboard"}
        </button>

        {adminDashboardLoading && (
          <p className="status">Loading dashboard statistics...</p>
        )}

        {adminDashboardError && (
          <p className="status error">{adminDashboardError}</p>
        )}

        {adminDashboard && !adminDashboardLoading && (
          <>
            <div
              className="admin-stats-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "20px",
                marginTop: "24px",
              }}
            >
              <article
                className="admin-stat-card"
                style={{
                  padding: "24px",
                  background: "#1c1c22",
                  border: "1px solid #e8e2dc",
                  borderRadius: "14px",
                }}
              >
                <p className="eyebrow">MOVIES</p>
                <h3 style={{ fontSize: "32px", margin: "10px 0" }}>
                  {adminDashboard.total_movies}
                </h3>
                <p>Total Movies</p>
              </article>

              <article
                className="admin-stat-card"
                style={{
                  padding: "24px",
                  background: "#1c1c22",
                  border: "1px solid #e8e2dc",
                  borderRadius: "14px",
                }}
              >
                <p className="eyebrow">SHOWS</p>
                <h3 style={{ fontSize: "32px", margin: "10px 0" }}>
                  {adminDashboard.total_shows}
                </h3>
                <p>Total Shows</p>
              </article>

              <article
                className="admin-stat-card"
                style={{
                  padding: "24px",
                  background: "#1c1c22",
                  border: "1px solid #e8e2dc",
                  borderRadius: "14px",
                }}
              >
                <p className="eyebrow">BOOKINGS</p>
                <h3 style={{ fontSize: "32px", margin: "10px 0" }}>
                  {adminDashboard.total_bookings}
                </h3>
                <p>Total Bookings</p>
              </article>

              <article
                className="admin-stat-card"
                style={{
                  padding: "24px",
                  background: "#1c1c22",
                  border: "1px solid #e8e2dc",
                  borderRadius: "14px",
                }}
              >
                <p className="eyebrow">REVENUE</p>
                <h3 style={{ fontSize: "32px", margin: "10px 0" }}>
                  ₹{Number(adminDashboard.total_revenue || 0).toLocaleString("en-IN")}
                </h3>
                <p>Total Booking Revenue</p>
              </article>
            </div>

            <div
              style={{
                marginTop: "28px",
                padding: "24px",
                background: "#1c1c22",
                border: "1px solid #303038",
                borderRadius: "14px",
              }}
            >
              <h3 style={{ color: "#f5f5f7" }}>Manage MovieTime</h3>
              <p style={{ color: "#b8b8c4" }}>
                Use Django Admin to add or update movies, create shows,
                and manage booking records.
              </p>

              <a
                href="http://127.0.0.1:8000/admin/"
                target="_blank"
                rel="noreferrer"
                className="hero-button"
                style={{
                  display: "inline-block",
                  marginTop: "12px",
                  textDecoration: "none",
                }}
              >
                Open Django Admin
              </a>
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <div className="app">
      <header className="navbar">
        <a
          className="brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            goHome();
          }}
        >
          <span className="brand-mark">M</span>
          <span>MovieTime</span>
        </a>

        <nav className="nav-links">
          <a
            href="#movies"
            onClick={(event) => {
              if (
                selectedMovie ||
                authMode ||
                showMyBookings ||
                showAdminDashboard
              ) {
                event.preventDefault();
                goHome();
              }
            }}
          >
            Movies
          </a>

          <a
            href="#about"
            onClick={(event) => {
              if (
                selectedMovie ||
                authMode ||
                showMyBookings ||
                showAdminDashboard
              ) {
                event.preventDefault();
                goHome();
              }
            }}
          >
            About
          </a>
        </nav>

        <div className="nav-auth">
          {loggedInUsername ? (
            <>
              <button
                className="auth-nav-button"
                type="button"
                onClick={openMyBookings}
              >
                My Bookings
              </button>

              {loggedInUsername.toLowerCase() === "manoj" && (
                <button
                  className="auth-nav-button"
                  type="button"
                  onClick={openAdminDashboard}
                >
                  Admin Dashboard
                </button>
              )}

              <span className="location">
                Hi, {loggedInUsername}
              </span>

              <button
                className="auth-nav-button"
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="auth-nav-button"
                type="button"
                onClick={() => {
                  setShowMyBookings(false);
                  setShowAdminDashboard(false);
                  setAuthMode("login");
                  setAuthMessage("");
                }}
              >
                Login
              </button>

              <button
                className="auth-nav-button auth-nav-primary"
                type="button"
                onClick={() => {
                  setShowMyBookings(false);
                  setShowAdminDashboard(false);
                  setAuthMode("register");
                  setAuthMessage("");
                }}
              >
                Register
              </button>
            </>
          )}

          <span className="location">Hyderabad, India</span>
        </div>
      </header>

      <main>
        {authMode ? (
          <section className="movies-section auth-section">
            <button
              className="back-button"
              onClick={() => {
                setAuthMode(null);
                setAuthMessage("");
              }}
            >
              ← Back
            </button>

            <p className="eyebrow">WELCOME TO MOVIETIME</p>

            <h2>
              {authMode === "register"
                ? "Create your account"
                : "Welcome back"}
            </h2>

            <p className="status">
              {authMode === "register"
                ? "Register to get started with MovieTime."
                : "Log in to your MovieTime account."}
            </p>

            <form className="auth-form" onSubmit={submitAuth}>
              <label htmlFor="auth-username">Username</label>

              <input
                id="auth-username"
                type="text"
                placeholder="Enter username"
                value={authUsername}
                onChange={(event) =>
                  setAuthUsername(event.target.value)
                }
                minLength={3}
                autoComplete="username"
                required
              />

              <label htmlFor="auth-password">Password</label>

              <input
                id="auth-password"
                type="password"
                placeholder="Enter password"
                value={authPassword}
                onChange={(event) =>
                  setAuthPassword(event.target.value)
                }
                minLength={8}
                autoComplete={
                  authMode === "register"
                    ? "new-password"
                    : "current-password"
                }
                required
              />

              <button
                className="book-button"
                type="submit"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "register"
                    ? "Create Account"
                    : "Login"}
              </button>
            </form>

            {authMessage && (
              <p className="status" role="status">
                {authMessage}
              </p>
            )}

            <p className="auth-switch">
              {authMode === "register"
                ? "Already have an account?"
                : "Don't have an account?"}

              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setAuthMode(
                    authMode === "register" ? "login" : "register"
                  );
                  setAuthMessage("");
                }}
              >
                {authMode === "register" ? " Login" : " Register"}
              </button>
            </p>
          </section>
        ) : showAdminDashboard ? (
          renderAdminDashboard()
        ) : showMyBookings ? (
          renderMyBookings()
        ) : selectedMovie ? (
          <section className="movies-section booking-section">
            <button className="back-button" onClick={closeBooking}>
              ← Back to movies
            </button>

            <p className="eyebrow">YOUR MOVIE NIGHT</p>
            <h2>{selectedMovie.title}</h2>

            <p className="status">
              Choose a theatre and show time.
            </p>

            {movieShows.length === 0 ? (
              <p className="status">
                No shows available for this movie yet.
                Add a show in Django Admin.
              </p>
            ) : (
              <>
                <div className="show-date-filter">
                  <label htmlFor="show-date">Show date</label>
                  <select
                    id="show-date"
                    value={selectedShowDate}
                    onChange={(event) => {
                      setSelectedShowDate(event.target.value);
                      updateSelectedShow(null);
                      setSelectedSeats([]);
                      clearBookedSeatAvailability();
                      setMessage("");
                    }}
                  >
                    <option value="All">All dates</option>
                    {movieShowDates.map((dateKey) => (
                      <option key={dateKey} value={dateKey}>
                        {new Intl.DateTimeFormat("en-IN", {
                          timeZone: "Asia/Kolkata",
                          dateStyle: "full",
                        }).format(
                          new Date(`${dateKey}T12:00:00+05:30`)
                        )}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredMovieShows.length === 0 ? (
                  <p className="status">
                    No shows available for this date.
                  </p>
                ) : (
                  <div className="show-grid">
                    {filteredMovieShows.map((show) => (
                      <button
                        key={show.id}
                        className={`show-card ${
                          Number(selectedShow?.id) === Number(show.id)
                            ? "selected"
                            : ""
                        }`}
                        onClick={async () => {
                          updateSelectedShow(show);
                          setSelectedSeats([]);
                          setMessage("");

                          try {
                            await loadBookedSeats(show.id);
                          } catch (seatError) {
                            if (
                              Number(selectedShowRef.current?.id) ===
                              Number(show.id)
                            ) {
                              console.error(
                                "Could not load booked seats:",
                                seatError
                              );
                              setMessage(
                                "Could not load seat availability. Please retry."
                              );
                            }
                          }
                        }}
                      >
                        <strong>{show.theatre}</strong>
                        <span>{formatDateTime(show.show_time)}</span>
                        <span>
                          ₹{Number(show.price).toFixed(2)} per seat
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {selectedShow && (
              <div className="seat-section">
                <h3>Select your seats</h3>

                {seatAvailability.status === "loading" &&
                  Number(seatAvailability.showId) ===
                    Number(selectedShow.id) && (
                    <p className="status" role="status">
                      Loading seat availability...
                    </p>
                  )}

                {seatAvailability.status === "error" &&
                  Number(seatAvailability.showId) ===
                    Number(selectedShow.id) && (
                    <div className="status error" role="alert">
                      <p>
                        {seatAvailability.error ||
                          "Could not load seat availability."}
                      </p>
                      <button
                        className="text-button"
                        type="button"
                        onClick={async () => {
                          setMessage("");
                          try {
                            await loadBookedSeats(selectedShow.id);
                          } catch (seatError) {
                            console.error(
                              "Booked seats retry error:",
                              seatError
                            );
                          }
                        }}
                        disabled={
                          seatAvailability.status === "loading"
                        }
                      >
                        Retry loading seats
                      </button>
                    </div>
                  )}

                <p className="status">
                  Screen is at the top. Choose your available seats below.
                </p>

                <div className="seat-legend">
                  <span>
                    <i className="legend-box available-box" />
                    Available
                  </span>

                  <span>
                    <i className="legend-box booked-box" />
                    Booked
                  </span>

                  <span>
                    <i className="legend-box selected-box" />
                    Selected
                  </span>
                </div>

                <div className="screen-label">SCREEN</div>

                <div className="seat-grid">
                  {Array.from(
                    {
                      length: Math.min(
                        Number(selectedShow.total_seats) || 40,
                        40
                      ),
                    },
                    (_, index) => {
                      const seat = `${String.fromCharCode(
                        65 + Math.floor(index / 8)
                      )}${(index % 8) + 1}`;

                      const isBooked = bookedSeats.includes(seat);
                      const isSelected = selectedSeats.includes(seat);

                      const seatClass = isBooked
                        ? "seat-booked"
                        : isSelected
                          ? "seat-selected"
                          : "seat-available";

                      return (
                        <button
                          key={seat}
                          type="button"
                          className={`seat ${seatClass}`}
                          onClick={() => toggleSeat(seat)}
                          aria-pressed={isSelected}
                          disabled={
                            isBooked ||
                            bookingLoading ||
                            !isSeatAvailabilityLoaded
                          }
                          title={
                            isBooked
                              ? `${seat} - Already booked`
                              : isSelected
                                ? `${seat} - Selected`
                                : `${seat} - Available`
                          }
                        >
                          {seat}
                        </button>
                      );
                    }
                  )}
                </div>

                <p className="status">
                  Selected:{" "}
                  {selectedSeats.length
                    ? selectedSeats.join(", ")
                    : "None"}
                </p>

                <h3>
                  Total: ₹
                  {(
                    Number(selectedShow.price) * selectedSeats.length
                  ).toFixed(2)}
                </h3>

                <button
                  className="book-button confirm-button"
                  type="button"
                  onClick={confirmBooking}
                  disabled={bookingLoading || !isSeatAvailabilityLoaded}
                >
                  {bookingLoading ? "Booking..." : "Confirm Booking"}
                </button>

                {message && (
                  <p
                    className={`status ${
                      message.startsWith("Booking successful!")
                        ? "success"
                        : message.toLowerCase().includes("failed") ||
                            message.toLowerCase().includes("already booked") ||
                            message.toLowerCase().includes("could not")
                          ? "error"
                          : ""
                    }`}
                    role="status"
                  >
                    {message}
                  </p>
                )}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="hero">
              <p className="eyebrow">YOUR NEXT MOVIE NIGHT</p>

              <h1>
                Good movies.
                <br />
                Great company.
              </h1>

              <p className="hero-text">
                Find a movie, pick your seats, and enjoy the show.
              </p>

              <a className="hero-button" href="#movies">
                Explore movies
              </a>
            </section>

            <section className="movies-section" id="movies">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">NOW SHOWING</p>
                  <h2>Movies you'll love</h2>
                </div>

                <span className="movie-count">
                  {filteredMovies.length} movies
                </span>
              </div>

              <div className="toolbar">
                <input
                  type="search"
                  placeholder="Search for a movie..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search movies"
                />

                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  aria-label="Filter by language"
                >
                  <option value="All">All languages</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Hindi">Hindi</option>
                  <option value="English">English</option>
                  <option value="Tamil">Tamil</option>
                </select>
              </div>

              {loading && (
                <p className="status">Loading movies...</p>
              )}

              {error && <p className="status error">{error}</p>}

              {!loading && !error && filteredMovies.length === 0 && (
                <p className="status">
                  No movies found. Try another search.
                </p>
              )}

              <div className="movie-grid">
                {filteredMovies.map((movie) => (
                  <article className="movie-card" key={movie.id}>
                    {movie.poster_url ? (
                      <img
                        className="movie-poster"
                        src={movie.poster_url}
                        alt={`${movie.title} poster`}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="poster-placeholder">
                        <span>NOW SHOWING</span>
                        <h3>{movie.title}</h3>
                      </div>
                    )}

                    <div className="movie-info">
                      <h3>{movie.title}</h3>

                      <p className="movie-description">
                        {movie.description}
                      </p>

                      <div className="movie-meta">
                        <span>{movie.language}</span>
                        <span>{movie.duration_min} min</span>
                      </div>

                      <button
                        className="book-button"
                        type="button"
                        onClick={() => openBooking(movie)}
                      >
                        Book tickets
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="about-section" id="about">
              <h2>Made for movie lovers.</h2>
              <p>
                Browse movies and find your next big-screen experience.
                Your next favourite film might be one click away.
              </p>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <span>MovieTime</span>
        <span>Made for a better movie night.</span>
      </footer>
    </div>
  );
}

export default App;
