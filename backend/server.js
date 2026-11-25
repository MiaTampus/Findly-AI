
const express = require("express");
const supabase = require("./config/supabase");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Welcome route
app.get("/", (req, res) => {
    res.send("Welcome to Findly AI Backend!");
});

// Test Supabase connection
app.get("/api/test-supabase", async (req, res) => {
    try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            message: "Findly AI Supabase client initialized successfully!"
        });

    } catch (error) {
        console.error("Supabase error:", error.message);

        res.status(500).json({
            success: false,
            message: "Supabase connection test failed.",
            details: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Findly AI server is running on port ${PORT}`);
});
