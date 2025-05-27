import { supabase } from "../db/supabase.js";
import { getUserDetails } from "./auth.js";

let currentBillId = null;

// Ensure that only tenants can access the bills page
document.addEventListener("DOMContentLoaded", () => {
    const user = getUserDetails();
    
    if (!user) {
        console.warn("No user found, redirecting to login.");
        window.location.href = "login.html";  // Redirect if no user is logged in
        return;
    }

    if (user.role !== "tenant") {
        console.warn("Non-tenant user trying to access tenant page, redirecting.");
        switch (user.role) {
            case "admin":
                window.location.href = "admin.html";
                break;
            case "landlord":
                window.location.href = "landlordDashboard.html";
                break;
            default:
                window.location.href = "login.html";
        }
        return;
    }

    console.log("User authenticated as tenant:", user);
    fetchActiveBills();
    fetchBillingHistory();
    setInterval(checkDueBills, 60000);

    const paymentModal = document.getElementById("paymentModal");
    const closePaymentModal = document.getElementById("closePaymentModal");
    const submitPaymentBtn = document.getElementById("submitPaymentBtn");
    document.body.addEventListener("click", function(e) {
        if (e.target.classList.contains("pay-bill-btn")) {
            currentBillId = e.target.getAttribute("data-id");
            document.getElementById("modalAmount").textContent = e.target.getAttribute("data-amount");
            paymentModal.classList.remove("hidden");
        }
    });
    if (closePaymentModal) {
        closePaymentModal.addEventListener("click", () => {
            paymentModal.classList.add("hidden");
            currentBillId = null;
            document.getElementById("paymentProofFile").value = "";
        });
    }
    if (submitPaymentBtn) {
        submitPaymentBtn.addEventListener("click", async () => {
            const fileInput = document.getElementById("paymentProofFile");
            const file = fileInput.files[0];
            if (!file) {
                alert("Please upload a proof of payment.");
                return;
            }
            const reader = new FileReader();
            reader.onload = async function(event) {
                const base64String = event.target.result;
                const user = getUserDetails();
                const { error } = await supabase.from("payment_proofs").insert([{
                    bill_id: currentBillId,
                    tenant_id: user.id,
                    image_url: base64String,
                    status: "pending"
                }]);
                if (error) {
                    alert("Failed to submit payment proof.");
                } else {
                    alert("Payment proof submitted! Awaiting verification.");
                    paymentModal.classList.add("hidden");
                    fileInput.value = "";
                    await supabase.from("bills").update({ status: "pending_payment" }).eq("id", currentBillId);
                }
            };
            reader.readAsDataURL(file);
        });
    }
});

// Fetch Active Bills
async function fetchActiveBills() {
    try {
        const user = getUserDetails();
        if (!user || user.role !== "tenant") {
            window.location.href = "index.html";
            return;
        }

        const { data: bills, error } = await supabase
            .from("bills")
            .select("*")
            .eq("tenant_id", user.id)
            .in("status", ["pending", "pending_payment"])
            .order("due_date", { ascending: true });

        if (error) {
            console.error("Error fetching active bills:", error);
            alert("Failed to fetch active bills. Please try again.");
            return;
        }

        const billListTable = document.getElementById("billListTable");
        if (!billListTable) {
            console.error("Could not find billListTable element");
            return;
        }

        billListTable.innerHTML = "";

        if (!bills || bills.length === 0) {
            billListTable.innerHTML = `
                <tr>
                    <td colspan="3" class="p-3 text-gray-600 text-center">No active bills</td>
                </tr>
            `;
            return;
        }

        bills.forEach(bill => {
            const dueDate = new Date(bill.due_date);
            const isOverdue = dueDate < new Date() && bill.status === "pending";
            
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="p-3">${bill.amount.toFixed(2)} PHP</td>
                <td class="p-3">${dueDate.toLocaleDateString()}</td>
                <td class="p-3">
                    <span class="${bill.status === 'overdue' ? 'text-red-500' : bill.status === 'pending_payment' ? 'text-blue-500' : 'text-yellow-500'}">
                        ${bill.status === 'overdue' ? 'Overdue' : bill.status === 'pending_payment' ? 'Pending Payment' : 'Pending'}
                    </span>
                </td>
            `;
            if (bill.status === "pending") {
                addPayButtonToRow(row, bill);
            }
            billListTable.appendChild(row);
        });

        // Check for overdue bills and show notification
        const overdueBills = bills.filter(bill => 
            new Date(bill.due_date) < new Date() && bill.status === "pending"
        );
        
        if (overdueBills.length > 0) {
            showNotification(`You have ${overdueBills.length} overdue bill(s)!`);
        }
    } catch (error) {
        console.error("Unexpected error in fetchActiveBills:", error);
        alert("An unexpected error occurred. Please try again.");
    }
}

// Fetch Billing History
async function fetchBillingHistory() {
    try {
        const user = getUserDetails();
        if (!user || user.role !== "tenant") {
            window.location.href = "index.html";
            return;
        }

        // Fetch paid/overdue bills from bills table
        const { data: bills, error: billsError } = await supabase
            .from("bills")
            .select("*")
            .eq("tenant_id", user.id)
            .in("status", ["paid", "overdue"])
            .order("due_date", { ascending: false });

        // Fetch billing_record
        const { data: billingHistory, error: recordError } = await supabase
            .from("billing_record")
            .select("*")
            .eq("tenant_id", user.id)
            .order("payment_date", { ascending: false });

        if (billsError || recordError) {
            console.error("Error fetching billing history:", billsError || recordError);
            alert("Failed to fetch billing history. Please try again.");
            return;
        }

        // Merge and sort by date (use payment_date if present, else due_date)
        let merged = [];
        if (bills) merged = merged.concat(bills.map(b => ({...b, _source: 'bills', sort_date: new Date(b.due_date)})));
        if (billingHistory) merged = merged.concat(billingHistory.map(b => ({...b, _source: 'billing_record', sort_date: new Date(b.payment_date || b.due_date)})));
        merged.sort((a, b) => b.sort_date - a.sort_date);

        // Store for filtering
        window.billingData = merged;
        displayBillingHistory(merged);
    } catch (error) {
        console.error("Unexpected error in fetchBillingHistory:", error);
        alert("An unexpected error occurred. Please try again.");
    }
}

// Display Billing History
function displayBillingHistory(bills) {
    const billHistoryTable = document.getElementById("billHistoryTable");
    if (!billHistoryTable) {
        console.error("Could not find billHistoryTable element");
        return;
    }

    billHistoryTable.innerHTML = "";

    if (bills.length === 0) {
        billHistoryTable.innerHTML = `<tr><td colspan="3" class="text-gray-600">No billing history found.</td></tr>`;
        return;
    }

    bills.forEach(bill => {
        const statusClass = getStatusClass(bill.status);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="p-3">${Number(bill.amount).toFixed(2)} PHP</td>
            <td class="p-3">${bill.payment_date ? new Date(bill.payment_date).toDateString() : new Date(bill.due_date).toDateString()}</td>
            <td class="p-3 ${statusClass}">${bill.status}</td>
        `;
        billHistoryTable.appendChild(row);
    });
}

// Utility Function: Get Status Class for Styling
function getStatusClass(status) {
    switch (status) {
        case 'pending':
            return 'text-yellow-500';  // Yellow for pending
        case 'paid':
            return 'text-green-500';   // Green for paid
        case 'overdue':
            return 'text-red-500';     // Red for overdue
        case 'pending_payment':
            return 'text-blue-500';     // Blue for pending payment
        default:
            return 'text-gray-500';    // Gray for unknown
    }
}

// Send Notifications (Simulated)
function sendNotification(message) {
    alert(message);
}

// Notify Due Bills
async function checkDueBills() {
    const user = getUserDetails();
    if (!user) return;

    const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("tenant_id", user.id)
        .eq("status", "pending");

    if (data && data.length > 0) {
        sendNotification("You have pending bills due soon!");
    }
}

function addPayButtonToRow(row, bill) {
    const td = document.createElement("td");
    td.innerHTML = `<button class="bg-green-500 text-white px-3 py-1 rounded pay-bill-btn" data-id="${bill.id}" data-amount="${bill.amount}">Pay</button>`;
    row.appendChild(td);
}
