// js/manageCancellations.js
import { supabase } from "../db/supabase.js";
import { getUserDetails } from "./auth.js";

// Fetch Cancellation Requests
async function fetchCancellationRequests() {
    try {
        // Fetch all cancellation requests with room and tenant details
        const { data: cancellationRequests, error } = await supabase
            .from("cancellation_requests")
            .select(`
                id,
                request_date,
                status,
                tenant_id,
                room_id,
                rooms (
                    id,
                    room_number
                )
            `)
            .order('request_date', { ascending: false });

        if (error) {
            console.error("Error fetching cancellation requests:", error);
            document.getElementById("cancellationList").innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Error loading cancellation requests.</td></tr>`;
            return;
        }

        if (!cancellationRequests || cancellationRequests.length === 0) {
            document.getElementById("cancellationList").innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-500">No cancellation requests found.</td></tr>`;
            return;
        }

        // Get tenant details for each request
        const tenantIds = cancellationRequests.map(request => request.tenant_id);
        const { data: tenants, error: tenantsError } = await supabase
            .from("users")
            .select("id, first_name, last_name, email, phone")
            .in("id", tenantIds);

        if (tenantsError) {
            console.error("Error fetching tenant details:", tenantsError);
        }

        // Create a map of tenant details
        const tenantMap = {};
        if (tenants) {
            tenants.forEach(tenant => {
                tenantMap[tenant.id] = tenant;
            });
        }

        const cancellationList = document.getElementById("cancellationList");
        cancellationList.innerHTML = cancellationRequests
            .map((request) => {
                const roomNumber = request.rooms ? request.rooms.room_number : "N/A";
                const tenant = tenantMap[request.tenant_id] || null;
                const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : "Unknown Tenant";

                let statusColorClass = "text-yellow-500";
                if (request.status === "approved") {
                    statusColorClass = "text-green-500 font-semibold";
                } else if (request.status === "rejected") {
                    statusColorClass = "text-red-500 font-semibold";
                }

                const actionButtons = request.status === "pending" 
                    ? `
                        <button class="bg-green-500 text-white px-3 py-1 rounded mr-2 approve-btn"
                            data-id="${request.id}" 
                            data-room="${request.rooms?.id}"
                            data-tenant="${request.tenant_id}">
                            ✅ Approve
                        </button>
                        <button class="bg-red-500 text-white px-3 py-1 rounded reject-btn"
                            data-id="${request.id}">
                            ❌ Reject
                        </button>
                    `
                    : '';

                return `
                    <tr class="border-b">
                        <td class="p-3">${tenantName}</td>
                        <td class="p-3">Room ${roomNumber}</td>
                        <td class="p-3">${new Date(request.request_date).toLocaleDateString()}</td>
                        <td class="p-3 ${statusColorClass}">${request.status}</td>
                        <td class="p-3">${actionButtons}</td>
                    </tr>
                `;
            })
            .join("");

        // Attach event listeners
        document.querySelectorAll(".approve-btn").forEach(button => {
            button.addEventListener("click", (e) => {
                const requestId = e.target.getAttribute("data-id");
                const roomId = e.target.getAttribute("data-room");
                const tenantId = e.target.getAttribute("data-tenant");
                confirmAction(() => approveCancellation(requestId, roomId, tenantId), "approve this cancellation request?");
            });
        });

        document.querySelectorAll(".reject-btn").forEach(button => {
            button.addEventListener("click", (e) => {
                const requestId = e.target.getAttribute("data-id");
                confirmAction(() => rejectCancellation(requestId), "reject this cancellation request?");
            });
        });
    } catch (error) {
        console.error("Error in fetchCancellationRequests:", error);
        document.getElementById("cancellationList").innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Error loading cancellation requests.</td></tr>`;
    }
}

// Confirm Action Before Executing
function confirmAction(action, message) {
    document.getElementById("confirmMessage").textContent = `Are you sure you want to ${message}`;
    document.getElementById("confirmModal").classList.remove("hidden");

    document.getElementById("confirmYes").onclick = () => {
        action();
        closeModal();
    };
}

// Close Modal
function closeModal() {
    document.getElementById("confirmModal").classList.add("hidden");
}

// Approve Cancellation Request
async function approveCancellation(requestId, roomId, tenantId) {
    try {
        // Update the cancellation request status to "approved"
        const { error: updateError } = await supabase
            .from("cancellation_requests")
            .update({ status: "approved" })
            .eq("id", requestId);

        if (updateError) {
            throw new Error("Error updating cancellation request");
        }

        // Update the room_tenants record to set end_date
        const { error: tenantError } = await supabase
            .from("room_tenants")
            .update({ end_date: new Date().toISOString() })
            .eq("tenant_id", tenantId)
            .eq("room_id", roomId)
            .is("end_date", null);

        if (tenantError) {
            throw new Error("Error updating tenant record");
        }

        alert("Cancellation request approved successfully!");
        fetchCancellationRequests(); // Refresh the list

    } catch (error) {
        console.error("Error approving cancellation request:", error);
        alert("Error approving cancellation request. Please try again.");
    }
}

// Reject Cancellation Request
async function rejectCancellation(requestId) {
    try {
        const { error } = await supabase
            .from("cancellation_requests")
            .update({ status: "rejected" })
            .eq("id", requestId);

        if (error) {
            throw new Error("Error rejecting cancellation request");
        }

        alert("Cancellation request rejected successfully!");
        fetchCancellationRequests(); // Refresh the list

    } catch (error) {
        console.error("Error rejecting cancellation request:", error);
        alert("Error rejecting cancellation request. Please try again.");
    }
}

// Initialize
document.addEventListener("DOMContentLoaded", fetchCancellationRequests);