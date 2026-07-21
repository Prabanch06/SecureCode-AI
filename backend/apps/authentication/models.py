from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    two_factor_enabled = models.BooleanField(default=False)
    email_alerts = models.BooleanField(default=True)
    role = models.CharField(max_length=50, default='Developer')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        role = 'Admin' if instance.is_superuser else 'Developer'
        Profile.objects.create(user=instance, role=role)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        if instance.is_superuser and instance.profile.role != 'Admin':
            instance.profile.role = 'Admin'
        instance.profile.save()
