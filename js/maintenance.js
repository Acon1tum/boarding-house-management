import { supabase } from "../db/supabase.js";
import { getUserDetails } from "./auth.js";

// Ensure only tenants can access this page
if (window.location.pathname.includes("maintenance.html")) {
    document.addEventListener("DOMContentLoaded", async () => {
        const user = getUserDetails();
        if (!user || user.role !== "tenant") {
            alert("Access Denied!");
            window.location.href = "dashboard.html";
            return;
        }

        document.getElementById("maintenanceForm").addEventListener("submit", submitRequest);
        fetchTenantRequests();
    });
}

// Submit a maintenance request
async function submitRequest(event) {
    event.preventDefault();
    
    const user = getUserDetails();
    const amenity = document.getElementById("amenity").value.trim();
    const description = document.getElementById("description").value.trim();

    if (!amenity || !description) {
        alert("All fields are required!");
        return;
    }

    const { error } = await supabase.from("maintenance_requests").insert([
        { tenant_id: user.id, amenity, description, status: "pending" }
    ]);

    if (error) {
        alert("Failed to submit request: " + error.message);
    } else {
        alert("Maintenance request submitted!");
        document.getElementById("maintenanceForm").reset();
        fetchTenantRequests();
    }
}

// Fetch maintenance requests for the logged-in tenant
async function fetchTenantRequests() {
    const user = getUserDetails();
    const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*")
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false });

    const requestList = document.getElementById("requestList");
    requestList.innerHTML = "";

    if (error || !data.length) {
        requestList.innerHTML = "<p class='text-gray-500'>No maintenance requests found.</p>";
        return;
    }

    data.forEach(request => {
        requestList.innerHTML += `
            <div class="p-4 border rounded-lg shadow">
                <p><strong>${request.amenity}</strong></p>
                <p class="text-gray-600">${request.description}</p>
                <p>Status: <span class="font-bold text-${getStatusColor(request.status)}">${request.status}</span></p>
            </div>
        `;
    });
}

// Fetch maintenance requests for landlords with filtering
export async function fetchMaintenanceRequests() {
    const filterStatus = document.getElementById("filterStatus").value;
    let query = supabase.from("maintenance_requests").select("id, amenity, description, status, users(first_name, last_name)").order("created_at", { ascending: false });
    
    if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
    }

    const { data, error } = await query;
    const maintenanceList = document.getElementById("maintenanceList");
    maintenanceList.innerHTML = "";

    if (error || !data.length) {
        maintenanceList.innerHTML = "<p class='text-gray-500'>No maintenance requests found.</p>";
        return;
    }

    data.forEach(request => {
        maintenanceList.innerHTML += `
            <div class="p-4 border rounded-lg shadow">
                <p><strong>${request.amenity}</strong> (by ${request.users.first_name} ${request.users.last_name})</p>
                <p class="text-gray-600">${request.description}</p>
                <p>Status: 
                    <select class="border p-1" onchange="updateRequestStatus('${request.id}', this.value)">
                        <option value="pending" ${request.status === "pending" ? "selected" : ""}>Pending</option>
                        <option value="in progress" ${request.status === "in progress" ? "selected" : ""}>In Progress</option>
                        <option value="completed" ${request.status === "completed" ? "selected" : ""}>Completed</option>
                        <option value="rejected" ${request.status === "rejected" ? "selected" : ""}>Rejected</option>
                    </select>
                </p>
            </div>
        `;
    });
}

// Update request status
export async function updateRequestStatus(requestId, status) {
    const { error } = await supabase
        .from("maintenance_requests")
        .update({ status })
        .eq("id", requestId);

    if (error) {
        alert("Failed to update request: " + error.message);
    } else {
        fetchMaintenanceRequests();
    }
}

// Get status color class
function getStatusColor(status) {
    switch (status) {
        case "pending": return "yellow-500";
        case "in progress": return "blue-500";
        case "completed": return "green-500";
        case "rejected": return "red-500";
        default: return "gray-500";
    }
}

// Ensure filter status dropdown triggers fetch
document.addEventListener("DOMContentLoaded", () => {
    const filterDropdown = document.getElementById("filterStatus");
    if (filterDropdown) {
        filterDropdown.addEventListener("change", fetchMaintenanceRequests);
    }
});