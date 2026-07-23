import os
import requests
from django.conf import settings
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, LoginSerializer, ChangePasswordSerializer, UserProfileSerializer, UserSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({"success": True}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"success": True}, status=status.HTTP_200_OK)

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"success": True}, status=status.HTTP_200_OK)

class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def post(self, request):
        user = request.user
        profile = user.profile
        
        display_name = request.data.get('displayName', '')
        if display_name:
            parts = display_name.split(' ', 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ''
            user.save()
            
        email = request.data.get('email', '')
        if email:
            user.email = email
            user.save()
            
        profile.two_factor_enabled = request.data.get('twoFactorEnabled', profile.two_factor_enabled)
        profile.email_alerts = request.data.get('emailAlerts', profile.email_alerts)
        profile.save()
        
        return Response(UserProfileSerializer(user).data)

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username_or_email = request.data.get("username_or_email", "").strip()
        if not username_or_email:
            return Response({"detail": "Username or email is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user exists by username or email
        user = User.objects.filter(username=username_or_email).first() or User.objects.filter(email=username_or_email).first()
        if not user:
            return Response({"detail": "User with this username or email does not exist."}, status=status.HTTP_404_NOT_FOUND)

        # Simulate sending verification OTP (constant code '123456' for demo convenience)
        return Response({
            "success": True,
            "message": f"Verification code sent to your registered email address.",
            "otp": "123456" # For easy local test/demonstration
        }, status=status.HTTP_200_OK)

class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username_or_email = request.data.get("username_or_email", "").strip()
        otp = request.data.get("otp", "").strip()
        new_password = request.data.get("new_password", "").strip()

        if not username_or_email or not otp or not new_password:
            return Response({"detail": "All fields (username/email, OTP, new password) are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(username=username_or_email).first() or User.objects.filter(email=username_or_email).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if otp != "123456":
            return Response({"detail": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)

        # Reset password
        user.set_password(new_password)
        user.save()
        return Response({"success": True, "message": "Password reset successful."}, status=status.HTTP_200_OK)

class GitHubOAuthConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        client_id = getattr(settings, 'GITHUB_CLIENT_ID', '')
        return Response({
            "github_client_id": client_id,
            "is_configured": bool(client_id)
        }, status=status.HTTP_200_OK)

class SessionJWTView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            refresh = RefreshToken.for_user(request.user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(request.user).data
            }, status=status.HTTP_200_OK)
        return Response({"error": "No authenticated session found"}, status=status.HTTP_401_UNAUTHORIZED)

class GitHubOAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'Code is required'}, status=status.HTTP_400_BAD_REQUEST)

        client_id = getattr(settings, 'GITHUB_CLIENT_ID', '')
        client_secret = getattr(settings, 'GITHUB_CLIENT_SECRET', '')

        # Fallback to simulated login if code is mock_* or GITHUB config is missing
        if code.startswith('mock_') or not client_id or not client_secret:
            # Create/retrieve mock user
            username = 'github_demo_user'
            email = 'demo.github@securecode.ai'
            user, created = User.objects.get_or_create(username=username, defaults={
                'email': email,
                'first_name': 'GitHub Demo',
                'last_name': 'User'
            })
            if created:
                user.set_unusable_password()
                user.save()
                
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
                "is_mocked": True
            }, status=status.HTTP_200_OK)

        # Real OAuth flow
        try:
            # 1. Exchange code for access token
            token_url = 'https://github.com/login/oauth/access_token'
            payload = {
                'client_id': client_id,
                'client_secret': client_secret,
                'code': code
            }
            headers = {'Accept': 'application/json'}
            res = requests.post(token_url, json=payload, headers=headers)
            res_data = res.json()
            access_token = res_data.get('access_token')

            if not access_token:
                return Response({'error': 'Failed to obtain access token from GitHub'}, status=status.HTTP_400_BAD_REQUEST)

            # 2. Fetch user profile
            user_url = 'https://api.github.com/user'
            user_headers = {'Authorization': f'token {access_token}'}
            user_res = requests.get(user_url, headers=user_headers)
            user_data = user_res.json()

            github_username = user_data.get('login')
            email = user_data.get('email')
            name = user_data.get('name') or ''

            if not github_username:
                return Response({'error': 'Failed to fetch GitHub profile info'}, status=status.HTTP_400_BAD_REQUEST)

            # 3. If email is not public, fetch emails list
            if not email:
                emails_url = 'https://api.github.com/user/emails'
                emails_res = requests.get(emails_url, headers=user_headers)
                emails_data = emails_res.json()
                # Find primary email
                for email_info in emails_data:
                    if email_info.get('primary'):
                        email = email_info.get('email')
                        break
                if not email and emails_data:
                    email = emails_data[0].get('email')

            # Ensure we have an email
            if not email:
                email = f"{github_username}@github.invalid"

            # 4. Find or create user
            user = User.objects.filter(email=email).first()
            if not user:
                user = User.objects.filter(username=github_username).first()
                if not user:
                    parts = name.split(' ', 1)
                    first_name = parts[0]
                    last_name = parts[1] if len(parts) > 1 else ''
                    user = User.objects.create(
                        username=github_username,
                        email=email,
                        first_name=first_name,
                        last_name=last_name
                    )
                    user.set_unusable_password()
                    user.save()

            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': f'GitHub OAuth error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
