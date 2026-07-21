from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User

class AccountsAPITest(APITestCase):
    def setUp(self):
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.profile_url = reverse('profile')
        self.change_password_url = reverse('change_password')
        self.user_data = {
            "username": "testuser",
            "email": "testuser@example.com",
            "password": "password123"
        }

    def test_register_user(self):
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["username"], "testuser")

    def test_login_user(self):
        self.client.post(self.register_url, self.user_data, format='json')
        login_data = {
            "username": "testuser",
            "password": "password123"
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_get_profile_authenticated(self):
        reg_response = self.client.post(self.register_url, self.user_data, format='json')
        access_token = reg_response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "testuser")

    def test_get_profile_unauthenticated(self):
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_role_in_registration_and_profile(self):
        # Register a new user
        reg_response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(reg_response.status_code, status.HTTP_201_CREATED)
        # Verify default role is 'Developer' in registration response user serialization
        self.assertEqual(reg_response.data["user"]["role"], "Developer")

        # Get profile with authentication and verify profile role
        access_token = reg_response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_response = self.client.get(self.profile_url)
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data["profile"]["role"], "Developer")

    def test_admin_user_role(self):
        # Create an admin user directly
        admin_user = User.objects.create_superuser(
            username="adminuser",
            email="admin@example.com",
            password="adminpassword123"
        )
        # Set profile role to Admin
        admin_user.profile.role = "Admin"
        admin_user.profile.save()

        # Login as Admin
        login_data = {
            "username": "adminuser",
            "password": "adminpassword123"
        }
        login_response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertEqual(login_response.data["user"]["role"], "Admin")

        # Get profile as Admin
        access_token = login_response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_response = self.client.get(self.profile_url)
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data["profile"]["role"], "Admin")

    def test_forgot_password_flow(self):
        # 1. Register a user
        self.client.post(self.register_url, self.user_data, format='json')
        
        # 2. Request OTP for non-existing user (expect 404)
        forgot_url = reverse('forgot_password')
        response = self.client.post(forgot_url, {"username_or_email": "nonexistent"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # 3. Request OTP for existing user (expect 200)
        response = self.client.post(forgot_url, {"username_or_email": "testuser"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["otp"], "123456")

        # 4. Reset password with invalid OTP (expect 400)
        reset_url = reverse('reset_password')
        reset_data = {
            "username_or_email": "testuser",
            "otp": "999999",
            "new_password": "newpassword123"
        }
        response = self.client.post(reset_url, reset_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Reset password with correct OTP (expect 200)
        reset_data["otp"] = "123456"
        response = self.client.post(reset_url, reset_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 6. Verify login with new password succeeds
        login_data = {
            "username": "testuser",
            "password": "newpassword123"
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
