// js/manageCancellations.js
import { supabase } from "../db/supabase.js";
import { getUserDetails } from "./auth.js";

// Fetch Cancellation Requests
async function fetchCancellationRequests() {
    const { data, error } = await supabase
        .from("cancellation_requests")
        .select("*, tenants:users(first_name, last_name), rooms(room_number)")
        .eq("status", "pending");

    if (error) {
        console.error("Error fetching cancellation requests:", error);
        return;
    }

    const cancellationList = document.getElementById("cancellationList");
    cancellationList.innerHTML = data.map(request => `
        <tr class="border-b">
            <td class="p-3">${request.tenants.first_name} ${request.tenants.last_name}</td>
            <td class="p-3">${request.rooms.room_number}</td>
            <td class="p-3">${new Date(request.request_date).toLocaleDateString()}</td>
            <td class="p-3 text-yellow-500 font-semibold">${request.status}</td>
            <td class="p-3">
                <button class="bg-green-500 text-white px-3 py-1 rounded approve-btn" data-id="${request.id}" data-room-id="${request.room_id}">
                    Approve
                </button>
                <button class="bg-red-500 text-white px-3 py-1 rounded reject-btn" data-id="${request.id}">
                    Reject
                </button>
            </td>
        </tr>
    `).join("");

    // Attach event listeners
    document.querySelectorAll(".approve-btn").forEach(button => {
        button.addEventListener("click", async () => {
            const requestId = button.getAttribute("data-id");
            const roomId = button.getAttribute("data-room-id");
            await approveCancellation(requestId, roomId);
        });
    });

    document.querySelectorAll(".reject-btn").forEach(button => {
        button.addEventListener("click", async () => {
            const requestId = button.getAttribute("data-id");
            await rejectCancellation(requestId);
        });
    });
}

// js/manageCancellations.js
async function approveCancellation(requestId, roomId) {
    // Fetch the cancellation request to get the tenant_id
    const { data: cancellationRequest, error: fetchError } = await supabase
        .from("cancellation_requests")
        .select("tenant_id")
        .eq("id", requestId)
        .single();

    if (fetchError) {
        alert("Failed to fetch cancellation request: " + fetchError.message);
        return;
    }

    // Update the cancellation request status to "approved"
    const { error: updateError } = await supabase
        .from("cancellation_requests")
        .update({ status: "approved" })
        .eq("id", requestId);

    if (updateError) {
        alert("Failed to approve cancellation request: " + updateError.message);
        return;
    }

    // Delete the tenant's booking
    const { error: deleteError } = await supabase
        .from("bookings")
        .delete()
        .eq("tenant_id", cancellationRequest.tenant_id)
        .eq("status", "approved");

    if (deleteError) {
        alert("Failed to delete booking: " + deleteError.message);
        return;
    }

    // Update the room status to "available"
    const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "available" })
        .eq("id", roomId);

    if (roomError) {
        alert("Failed to update room status: " + roomError.message);
        return;
    }

    alert("Cancellation request approved, booking removed, and room status updated.");
    fetchCancellationRequests(); // Refresh the list of cancellation requests
}

// Reject Cancellation Request
async function rejectCancellation(requestId) {
    const { error } = await supabase
        .from("cancellation_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

    if (error) {
        alert("Failed to reject cancellation request: " + error.message);
    } else {
        alert("Cancellation request rejected.");
        fetchCancellationRequests();
    }
}

// Initialize
document.addEventListener("DOMContentLoaded", fetchCancellationRequests);