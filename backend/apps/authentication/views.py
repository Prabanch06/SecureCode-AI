from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from .models import Profile
from .serializers import UserSerializer

@api_view(['GET', 'POST'])
def profile_view(req):
    # Auto-initialize user 'alex' as default for API usage / portfolio simplicity
    user, _ = User.objects.get_or_create(username='alex_chen', defaults={
        'email': 'alex.chen@example.com',
        'first_name': 'Alex',
        'last_name': 'Chen'
    })
    
    profile = user.profile
    if req.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data)
        
    elif req.method == 'POST':
        # Update user profile
        data = req.body
        display_name = req.data.get('displayName', '')
        if display_name:
            parts = display_name.split(' ', 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ''
            user.save()
            
        email = req.data.get('email', '')
        if email:
            user.email = email
            user.save()
            
        profile.two_factor_enabled = req.data.get('twoFactorEnabled', profile.two_factor_enabled)
        profile.email_alerts = req.data.get('emailAlerts', profile.email_alerts)
        profile.save()
        
        return Response(UserSerializer(user).data)

@api_view(['GET', 'POST'])
def team_list_view(req):
    # Auto-populate mock team members if db is empty
    if User.objects.count() <= 1:
        # Create mock members
        m1 = User.objects.create(username='sarah_m', email='sarah.m@example.com', first_name='Sarah', last_name='Miller')
        m1.profile.role = 'Developer'
        m1.profile.save()
        
        m2 = User.objects.create(username='james_w', email='j.wilson@example.com', first_name='James', last_name='Wilson')
        m2.profile.role = 'Developer'
        m2.profile.save()
        
        m3 = User.objects.create(username='elena_r', email='elena.r@example.com', first_name='Elena', last_name='Rodriguez')
        m3.profile.role = 'Viewer'
        m3.profile.save()
        
    if req.method == 'GET':
        users = User.objects.all().order_by('id')
        mapped_members = []
        for u in users:
            mapped_members.append({
                'id': str(u.id),
                'name': f"{u.first_name} {u.last_name}".strip(),
                'email': u.email,
                'role': u.profile.role,
                'status': 'Active' if u.username != 'elena_r' else 'Pending',
                'lastActive': '2 mins ago' if u.username == 'alex_chen' else ('1 hr ago' if u.username == 'sarah_m' else None)
            })
        return Response(mapped_members)
        
    elif req.method == 'POST':
        name = req.data.get('name', '')
        email = req.data.get('email', '')
        role = req.data.get('role', 'Developer')
        
        username = email.split('@')[0].replace('.', '_')
        parts = name.split(' ', 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ''
        
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Member already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.create(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name
        )
        user.profile.role = role
        user.profile.save()
        
        return Response({
            'id': str(user.id),
            'name': name,
            'email': email,
            'role': role,
            'status': 'Pending'
        }, status=status.HTTP_201_CREATED)

@api_view(['PUT', 'DELETE'])
def team_detail_view(req, member_id):
    try:
        user = User.objects.get(id=member_id)
    except User.DoesNotExist:
        return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)
        
    if req.method == 'PUT':
        role = req.data.get('role')
        if not role:
            return Response({'error': 'Role is required'}, status=status.HTTP_400_BAD_REQUEST)
        user.profile.role = role
        user.profile.save()
        return Response({'success': True})
        
    elif req.method == 'DELETE':
        user.delete()
        return Response({'success': True})
