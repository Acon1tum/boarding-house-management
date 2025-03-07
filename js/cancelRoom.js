// js/cancelRoom.js
import { supabase } from "../db/supabase.js";
import { getUserDetails } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = getUserDetails();
    if (!user || user.role !== "tenant") {
        window.location.href = "login.html";
        return;
    }

    // Fetch the tenant's current booking
    const { data: booking, error } = await supabase
        .from("bookings")
        .select("id, room_id")
        .eq("tenant_id", user.id)
        .eq("status", "approved")
        .maybeSingle();

    if (error || !booking) {
        alert("You do not have an active booking to cancel.");
        window.location.href = "dashboard.html";
        return;
    }

    // Handle form submission
    document.getElementById("cancelRoomForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const { error } = await supabase
            .from("cancellation_requests")
            .insert([{ tenant_id: user.id, room_id: booking.room_id }]);

        if (error) {
            alert("Failed to submit cancellation request: " + error.message);
        } else {
            alert("Cancellation request submitted successfully!");
            window.location.href = "dashboard.html";
        }
    });
});