const supabaseClient = window.supabaseClient;

const form = document.getElementById('regForm');
const err = document.getElementById('err');
const $ = (id) => document.getElementById(id);

// Show / hide password
document.querySelectorAll('.eye').forEach((btn) => {
    btn.onclick = () => {
        const input = btn.previousElementSibling;
        input.type = input.type === 'password' ? 'text' : 'password';
    };
});

function showError(msg) {
    err.textContent = msg;
    err.hidden = false;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = $('name').value.trim();
    const sid = $('sid').value.trim();
    const email = $('email').value.trim();
    const password = $('pass').value;
    const confirmPassword = $('pass2').value;

    if (!name || !sid || !email || !password || !confirmPassword) {
        return showError('Please fill in all fields.');
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return showError('Please enter a valid email address.');
    }

    if (password.length < 8) {
        return showError('Password must be at least 8 characters.');
    }

    if (password !== confirmPassword) {
        return showError('Passwords do not match.');
    }

    err.hidden = true;

    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    student_id: sid
                }
            }
        });

        if (error) throw error;

        if (data.user && !data.session) {
            alert('Registration successful! Please check your email to verify your account.');
        } else {
            alert('Account created successfully! Please log in.');
        }

        window.location.href = 'login.html';

    } catch (error) {
        console.error('Registration error:', error);
        showError(error.message);

    } finally {
        if (submitButton) submitButton.disabled = false;
    }
});