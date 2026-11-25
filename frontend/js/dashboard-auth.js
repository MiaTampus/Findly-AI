(async function () {
    const supabaseClient = window.supabaseClient;

    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session) {
        window.location.replace('login.html');
    }
})();