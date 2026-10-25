from django.db import models
from django.conf import settings


class Movie(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    duration_min = models.PositiveIntegerField()
    language = models.CharField(max_length=50, default="Telugu")
    poster_url = models.URLField(blank=True)

    def __str__(self):
        return self.title


class Show(models.Model):
    movie = models.ForeignKey(Movie, related_name="shows", on_delete=models.CASCADE)
    theatre = models.CharField(max_length=255)
    show_time = models.DateTimeField()
    price = models.DecimalField(max_digits=7, decimal_places=2)
    total_seats = models.PositiveIntegerField(default=40)

    def __str__(self):
        return f"{self.movie} at {self.theatre} ({self.show_time})"


class Booking(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    show = models.ForeignKey(Show, related_name="bookings", on_delete=models.CASCADE)
    seat_number = models.CharField(max_length=5)
    booked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Prevents two bookings from reserving the same seat for one show.
        unique_together = (("show", "seat_number"),)

    def __str__(self):
        return f"{self.show}: {self.seat_number}"
