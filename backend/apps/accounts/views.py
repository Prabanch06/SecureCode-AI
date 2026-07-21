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
