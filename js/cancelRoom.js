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
        .select(`
            id, 
            room_id,
            start_date,
            rooms (
                room_number
            )
        `)
        .eq("tenant_id", user.id)
        .is("end_date", null);

    if (error || !tenancies || tenancies.length === 0) {
        document.getElementById("cancelRoomForm").innerHTML = `
            <div class="text-center p-4 text-gray-500">
                <p>You do not have any active room bookings to cancel.</p>
                <a href="dashboard.html" class="text-blue-500 hover:underline mt-2 inline-block">Return to Dashboard</a>
            </div>
        `;
        return;
    }

    // Display current room information
    const roomInfo = document.createElement("div");
    roomInfo.className = "mb-4 p-4 bg-gray-50 rounded-lg";
    roomInfo.innerHTML = `
        <h4 class="font-semibold text-gray-700 mb-2">Your Current Room</h4>
        <p class="text-gray-600">Room Number: ${tenancies[0].rooms.room_number}</p>
        <p class="text-gray-600">Start Date: ${new Date(tenancies[0].start_date).toLocaleDateString()}</p>
    `;
    document.getElementById("cancelRoomForm").prepend(roomInfo);

    // Handle form submission
    document.getElementById("cancelRoomForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        try {
            // Create cancellation request
            const { error: insertError } = await supabase
                .from("cancellation_requests")
                .insert([{ 
                    tenant_id: user.id, 
                    room_id: tenancies[0].room_id,
                    request_date: new Date().toISOString(),
                    status: "pending"
                }]);

            if (insertError) {
                throw new Error(insertError.message);
            }

            alert("Cancellation request submitted successfully!");
            window.location.href = "dashboard.html";
        } catch (error) {
            console.error("Error submitting cancellation request:", error);
            alert("Failed to submit cancellation request: " + error.message);
        }
    });
});