
import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .models import Movie, Show, Booking


# USER REGISTRATION
@csrf_exempt
@require_POST
def register_api(request):
    try:
        data = json.loads(request.body)

        username = data.get("username", "").strip()
        password = data.get("password", "")

        if not username or not password:
            return JsonResponse(
                {"error": "Username and password are required."},
                status=400,
            )

        if len(username) < 3:
            return JsonResponse(
                {"error": "Username must contain at least 3 characters."},
                status=400,
            )

        if len(password) < 8:
            return JsonResponse(
                {"error": "Password must contain at least 8 characters."},
                status=400,
            )

        if User.objects.filter(username=username).exists():
            return JsonResponse(
                {"error": "Username already exists."},
                status=409,
            )

        User.objects.create_user(
            username=username,
            password=password,
        )

        return JsonResponse(
            {
                "message": "Registration successful! Please log in.",
                "username": username,
            },
            status=201,
        )

    except (json.JSONDecodeError, TypeError):
        return JsonResponse(
            {"error": "Invalid request data."},
            status=400,
        )


# USER LOGIN
@csrf_exempt
@require_POST
def login_api(request):
    try:
        data = json.loads(request.body)

        username = data.get("username", "").strip()
        password = data.get("password", "")

        if not username or not password:
            return JsonResponse(
                {"error": "Username and password are required."},
                status=400,
            )

        user = authenticate(
            request,
            username=username,
            password=password,
        )

        if user is None:
            return JsonResponse(
                {"error": "Invalid username or password."},
                status=401,
            )

        login(request, user)

        return JsonResponse(
            {
                "message": "Login successful!",
                "username": user.username,
            }
        )

    except (json.JSONDecodeError, TypeError):
        return JsonResponse(
            {"error": "Invalid request data."},
            status=400,
        )


# CURRENT LOGGED-IN USER
@require_GET
def current_user_api(request):
    if request.user.is_authenticated:
        return JsonResponse(
            {
                "authenticated": True,
                "username": request.user.username,
            }
        )

    return JsonResponse(
        {
            "authenticated": False,
            "username": None,
        }
    )


# USER LOGOUT
@csrf_exempt
@require_POST
def logout_api(request):
    logout(request)

    return JsonResponse(
        {"message": "Logout successful."}
    )


# MOVIE LIST
@require_GET
def movie_list_api(request):
    movies = Movie.objects.all()

    data = [
        {
            "id": movie.id,
            "title": movie.title,
            "description": movie.description,
            "duration_min": movie.duration_min,
            "language": movie.language,
            "poster_url": movie.poster_url,
        }
        for movie in movies
    ]

    return JsonResponse(data, safe=False)


# SHOW LIST
@require_GET
def show_list_api(request):
    shows = Show.objects.select_related("movie").all()

    data = [
        {
            "id": show.id,
            "movie_title": show.movie.title,
            "theatre": show.theatre,
            "show_time": show.show_time.isoformat(),
            "price": str(show.price),
            "total_seats": show.total_seats,
        }
        for show in shows
    ]

    return JsonResponse(data, safe=False)


# ALL BOOKED SEATS FOR A SHOW
# Returns seat numbers only, not other users' private booking details.
@require_GET
def booked_seats_api(request):
    show_id = request.GET.get("show_id")

    if not show_id:
        return JsonResponse(
            {"error": "Show ID is required."},
            status=400,
        )

    try:
        show = Show.objects.get(id=show_id)

    except (Show.DoesNotExist, ValueError):
        return JsonResponse(
            {"error": "Show not found."},
            status=404,
        )

    seats = list(
        Booking.objects.filter(show=show)
        .values_list("seat_number", flat=True)
    )

    return JsonResponse(
        {
            "show_id": show.id,
            "booked_seats": seats,
        }
    )


# LIST BOOKINGS - ONLY CURRENT USER'S BOOKINGS
@require_GET
def booking_list_api(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"error": "Please log in to view your bookings."},
            status=401,
        )

    bookings = (
        Booking.objects.filter(user=request.user)
        .select_related("show", "show__movie")
        .order_by("-booked_at")
    )

    data = [
        {
            "id": booking.id,
            "username": booking.user.username,
            "show_id": booking.show.id,
            "movie_title": booking.show.movie.title,
            "theatre": booking.show.theatre,
            "show_time": booking.show.show_time.isoformat(),
            "seat_number": booking.seat_number,
            "booked_at": booking.booked_at.isoformat(),
        }
        for booking in bookings
    ]

    return JsonResponse(data, safe=False)


# CREATE BOOKING
@csrf_exempt
@require_POST
def create_booking_api(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"error": "Please log in before booking tickets."},
            status=401,
        )

    try:
        data = json.loads(request.body)

        show_id = data.get("show_id")
        seats = data.get("seats", [])

        if not show_id or not isinstance(seats, list) or not seats:
            return JsonResponse(
                {"error": "Show ID and seats are required."},
                status=400,
            )

        if (
            any(not isinstance(seat, str) for seat in seats)
            or len(seats) != len(set(seats))
        ):
            return JsonResponse(
                {"error": "Invalid or duplicate seats selected."},
                status=400,
            )

        show = Show.objects.get(id=show_id)
        seat_capacity = min(show.total_seats, 40)
        valid_seats = {
            f"{chr(65 + index // 8)}{(index % 8) + 1}"
            for index in range(seat_capacity)
        }

        if any(seat not in valid_seats for seat in seats):
            return JsonResponse(
                {"error": "Invalid seat number."},
                status=400,
            )

        if len(seats) > show.total_seats:
            return JsonResponse(
                {"error": "Invalid number of seats."},
                status=400,
            )

        with transaction.atomic():
            # Lock the show row while checking and creating bookings.
            Show.objects.select_for_update().get(id=show.id)

            for seat in seats:
                if Booking.objects.filter(
                    show=show,
                    seat_number=seat,
                ).exists():
                    return JsonResponse(
                        {
                            "error": f"Seat {seat} is already booked."
                        },
                        status=409,
                    )

            bookings = [
                Booking(
                    user=request.user,
                    show=show,
                    seat_number=seat,
                )
                for seat in seats
            ]

            Booking.objects.bulk_create(bookings)

        return JsonResponse(
            {
                "message": "Booking successful!",
                "show_id": show.id,
                "movie": show.movie.title,
                "theatre": show.theatre,
                "seats": seats,
                "total_amount": str(show.price * len(seats)),
            },
            status=201,
        )

    except Show.DoesNotExist:
        return JsonResponse(
            {"error": "Show not found."},
            status=404,
        )

    except IntegrityError:
        return JsonResponse(
            {"error": "One or more seats are already booked."},
            status=409,
        )

    except (json.JSONDecodeError, TypeError):
        return JsonResponse(
            {"error": "Invalid request data."},
            status=400,
        )

# ADMIN DASHBOARD STATISTICS
@require_GET
def admin_dashboard_api(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse(
            {"error": "Admin access required."},
            status=403,
        )

    from django.db.models import Sum, Count

    total_movies = Movie.objects.count()
    total_shows = Show.objects.count()
    total_bookings = Booking.objects.count()

    revenue_data = Booking.objects.aggregate(
        total=Sum("show__price")
    )
    total_revenue = revenue_data["total"] or 0

    return JsonResponse({
        "total_movies": total_movies,
        "total_shows": total_shows,
        "total_bookings": total_bookings,
        "total_revenue": str(total_revenue),
    })
