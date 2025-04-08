// js/cancelRoom.js
import { supabase } from "../db/supabase.js";
import { getUserDetails } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = getUserDetails();
    if (!user || user.role !== "tenant") {
        window.location.href = "login.html";
        return;
    }

    // Fetch the tenant's current tenancies
    const { data: tenancies, error } = await supabase
        .from("room_tenants")
        .select("id, room_id")
        .eq("tenant_id", user.id)
        .is("end_date", null);

    if (error || !tenancies || tenancies.length === 0) {
        alert("You do not have any active room bookings to cancel.");
        window.location.href = "dashboard.html";
        return;
    }

    // Handle form submission
    document.getElementById("cancelRoomForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const { error } = await supabase
            .from("cancellation_requests")
            .insert(tenancies.map(tenancy => ({ 
                tenant_id: user.id, 
                room_id: tenancy.room_id 
            })));

        if (error) {
            alert("Failed to submit cancellation request: " + error.message);
        } else {
            alert("Cancellation request submitted successfully!");
            window.location.href = "dashboard.html";
        }
    });
});