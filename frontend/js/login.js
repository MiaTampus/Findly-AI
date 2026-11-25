const supabaseClient = window.supabaseClient;

const form = document.getElementById('loginForm');
const pass = document.getElementById('pass');
const err = document.getElementById('err');

document.getElementById('eye').onclick = () => {
    pass.type = pass.type === 'password' ? 'text' : 'password';
};

function showError(message) {
    err.textContent = message;
    err.hidden = false;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('user').value.trim();
    const password = pass.value;

    if (!email || !password) {
        showError('Please enter your email and password.');
        return;
    }

    err.hidden = true;

    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (!data.session) {
            showError('Please verify your email before logging in.');
            return;
        }

        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error('Login error:', error);

        showError(
            error.message === 'Invalid login credentials'
                ? 'Incorrect email or password. Check whether your email is verified.'
                : error.message
        );

    } finally {
        if (submitButton) submitButton.disabled = false;
    }
});