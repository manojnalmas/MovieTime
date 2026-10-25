from django.contrib import admin
from .models import Booking, Movie, Show


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ("title", "language", "duration_min")
    list_filter = ("language",)


@admin.register(Show)
class ShowAdmin(admin.ModelAdmin):
    list_display = ("movie", "theatre", "show_time", "price", "total_seats")
    list_filter = ("theatre", "movie")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("user", "show", "seat_number", "booked_at")
    list_filter = ("show", "booked_at")
