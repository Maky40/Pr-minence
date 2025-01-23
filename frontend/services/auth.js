

const API_URL = "https://dummyjson.com";
const LoginURL = `${API_URL}/auth/login`;
const RegisterURL = `${API_URL}/auth/register`;
const RefreshURL = `${API_URL}/auth/refresh`;
class Auth {
    constructor() {
        this.authenticated = false;
        this.user = null;
        this.token = null;
        this.refreshToken = null;
        this.listeners = new Set();
        this.initFromStorage();
    }

    initFromStorage() {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));
            if (token && user) {
                this.authenticated = true;
                this.token = token;
                this.user = user;
            }
        } catch (error) {
            console.error('Error loading auth state:', error);
        }
    }

    async login(username, password) {
        try {
            const response = await fetch(LoginURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) throw new Error('Login failed');

            const data = await response.json();
            this.setSession(data);
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    registerUser(userData) {
        return fetch(RegisterURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        }).then(response => {
            if (!response.ok) throw new Error('Registration failed');
            return response.json();
        });
    }

    setSession(data) {
        this.authenticated = true;
        this.token = data.token;
        this.user = data.user;
        this.refreshToken = data.refreshToken;
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.notifyListeners('login');
    }

    logout() {
        this.authenticated = false;
        this.user = null;
        this.token = null;
        this.refreshToken = null;
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.notifyListeners('logout');
    }

    async refreshSession() {
        try {
            const response = await fetch(RefreshURL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.refreshToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Token refresh failed');

            const data = await response.json();
            this.setSession(data);
            return data;
        } catch (error) {
            this.logout();
            throw error;
        }
    }

    isAuthenticated() {
        return this.authenticated && this.token !== null;
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(event) {
        this.listeners.forEach(callback => callback(event));
    }

    async updateProfile(userData) {
        try {
            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) throw new Error('Profile update failed');

            const updatedUser = await response.json();
            this.user = updatedUser;
            localStorage.setItem('user', JSON.stringify(updatedUser));
            this.notifyListeners('profile_updated');
            return updatedUser;
        } catch (error) {
            console.error('Profile update error:', error);
            throw error;
        }
    }
}

const auth = new Auth();
export default auth;