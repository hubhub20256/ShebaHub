from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class SignupTestCase(APITestCase):
    """
    Test cases for user signup endpoint.
    """
    
    def setUp(self):
        self.signup_url = reverse('signup')
        self.valid_payload = {
            'email': 'test@example.com',
            'password': 'StrongPassword123!',
            'confirmPassword': 'StrongPassword123!',
            'firstName': 'John',
            'lastName': 'Doe',
            'gender': 'male',
        }
    
    def test_signup_success(self):
        """
        Test successful user registration.
        """
        response = self.client.post(self.signup_url, self.valid_payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['email'], self.valid_payload['email'])
        self.assertEqual(response.data['user']['firstName'], self.valid_payload['firstName'])
        self.assertEqual(response.data['user']['lastName'], self.valid_payload['lastName'])
        self.assertFalse(response.data['user']['has_student_profile'])
        self.assertFalse(response.data['user']['has_mentor_profile'])
        
        # Verify user was created in database
        self.assertTrue(User.objects.filter(email=self.valid_payload['email']).exists())
    
    def test_signup_duplicate_email(self):
        """
        Test signup with duplicate email fails.
        """
        # Create initial user
        User.objects.create_user(
            email=self.valid_payload['email'],
            password='password123',
            firstName='Jane',
            lastName='Doe'
        )
        
        # Attempt to create user with same email
        response = self.client.post(self.signup_url, self.valid_payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data['code'], 'CONFLICT')
    
    def test_signup_weak_password(self):
        """
        Test signup with weak password fails.
        """
        payload = self.valid_payload.copy()
        payload['password'] = '123'
        payload['confirmPassword'] = '123'
        
        response = self.client.post(self.signup_url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
    
    def test_signup_missing_required_fields(self):
        """
        Test signup with missing required fields fails.
        """
        incomplete_payload = {
            'email': 'test@example.com',
        }
        
        response = self.client.post(self.signup_url, incomplete_payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
        self.assertIn('firstName', response.data)
        self.assertIn('lastName', response.data)
    
    def test_signup_invalid_email(self):
        """
        Test signup with invalid email format fails.
        """
        payload = self.valid_payload.copy()
        payload['email'] = 'not-an-email'
        
        response = self.client.post(self.signup_url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)


class LoginTestCase(APITestCase):
    """
    Test cases for user login endpoint.
    """
    
    def setUp(self):
        self.login_url = reverse('login')
        self.email = 'testuser@example.com'
        self.password = 'TestPassword123!'
        
        # Create test user
        self.user = User.objects.create_user(
            email=self.email,
            password=self.password,
            firstName='Test',
            lastName='User'
        )
    
    def test_login_success(self):
        """
        Test successful user login.
        """
        payload = {
            'email': self.email,
            'password': self.password,
        }
        
        response = self.client.post(self.login_url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['email'], self.email)
        self.assertFalse(response.data['user']['has_student_profile'])
        self.assertFalse(response.data['user']['has_mentor_profile'])
    
    def test_login_wrong_password(self):
        """
        Test login with incorrect password fails.
        """
        payload = {
            'email': self.email,
            'password': 'WrongPassword123!',
        }
        
        response = self.client.post(self.login_url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
    
    def test_login_nonexistent_user(self):
        """
        Test login with non-existent email fails.
        """
        payload = {
            'email': 'nonexistent@example.com',
            'password': self.password,
        }
        
        response = self.client.post(self.login_url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
    
    def test_login_inactive_user(self):
        """
        Test login with inactive user fails.
        """
        self.user.is_active = False
        self.user.save()
        
        payload = {
            'email': self.email,
            'password': self.password,
        }
        
        response = self.client.post(self.login_url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
    
    def test_login_missing_credentials(self):
        """
        Test login with missing credentials fails.
        """
        payload = {
            'email': self.email,
        }
        
        response = self.client.post(self.login_url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)


class TokenRefreshTestCase(APITestCase):
    """
    Test cases for token refresh endpoint.
    """
    
    def setUp(self):
        self.refresh_url = reverse('token_refresh')
        
        # Create test user and get tokens
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='TestPassword123!',
            firstName='Test',
            lastName='User'
        )
        
        # Login to get tokens
        login_url = reverse('login')
        response = self.client.post(login_url, {
            'email': 'testuser@example.com',
            'password': 'TestPassword123!',
        }, format='json')
        
        self.refresh_token = response.data['tokens']['refresh']
    
    def test_token_refresh_success(self):
        """
        Test successful token refresh.
        """
        payload = {
            'refresh': self.refresh_token,
        }
        
        response = self.client.post(self.refresh_url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
    
    def test_token_refresh_invalid_token(self):
        """
        Test token refresh with invalid token fails.
        """
        payload = {
            'refresh': 'invalid-token-string',
        }
        
        response = self.client.post(self.refresh_url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
