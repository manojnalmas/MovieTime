
"""
URL configuration for config project.
"""

from django.contrib import admin
from django.urls import path

from tickets.views import (
    movie_list_api,
    show_list_api,
    booked_seats_api,
    booking_list_api,
    create_booking_api,
    register_api,
    login_api,
    current_user_api,
    logout_api,
    admin_dashboard_api,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # Movies API
    path(
        'api/movies/',
        movie_list_api,
        name='movie_list_api',
    ),

    # Shows API
    path(
        'api/shows/',
        show_list_api,
        name='show_list_api',
    ),

    # Booked seats for a particular show
    path(
        'api/booked-seats/',
        booked_seats_api,
        name='booked_seats_api',
    ),

    # List current user's bookings
    path(
        'api/bookings/',
        booking_list_api,
        name='booking_list_api',
    ),

    # Create a booking
    path(
        'api/bookings/create/',
        create_booking_api,
        name='create_booking_api',
    ),

    # User registration
    path(
        'api/register/',
        register_api,
        name='register_api',
    ),

    # User login
    path(
        'api/login/',
        login_api,
        name='login_api',
    ),

    # Check current logged-in user
    path(
        'api/me/',
        current_user_api,
        name='current_user_api',
    ),

    # User logout
    path(
        'api/logout/',
        logout_api,
        name='logout_api',
    ),

    # Admin Dashboard API
    path(
        'api/admin-dashboard/',
        admin_dashboard_api,
        name='admin_dashboard_api',
    ),
]
