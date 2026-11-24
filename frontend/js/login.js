
const supabaseClient = window.supabase.createClient(
  'https://iulfushvckvbvfbutjlh.supabase.co',
  'YOUR_SUPABASE_PUBLISHABLE_KEY'
);

const form = document.getElementById('loginForm');
const pass = document.getElementById('pass');
const err = document.getElementById('err');

// show / hide password
document.getElementById('eye').onclick = () => {
  pass.type = pass.type === 'password' ? 'text' : 'password';
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const user = document.getElementById('user').value.trim();

  if (!user || !pass.value) {
    err.textContent = 'Please enter your Student ID/Email and password.';
    err.hidden = false;
    return;
  }

  err.hidden = true;

  const submitButton = form.querySelector('[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: user,
      password: pass.value
    });

    if (error) throw error;

    window.location.href = 'dashboard.html';

  } catch (error) {
    console.error('Login error:', error);

    err.textContent = error.message === 'Invalid login credentials'
      ? 'Incorrect email or password.'
      : error.message;

    err.hidden = false;

  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});
