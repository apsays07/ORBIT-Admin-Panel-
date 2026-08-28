import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/nexo";
const client = new MongoClient(uri);

async function main() {
  try {
    await client.connect();
    const db = client.db("nexo");

    const ipo = await db.collection("ipos").findOne({ id: "ipo_1787545031813" });
    const apps = await db.collection("applications").find({ ipoId: "ipo_1787545031813" }).toArray();

    console.log("=== Apps summary ===");
    console.log("Total app docs:", apps.length);

    let totalPans = 0;
    let totalContrib = 0;

    for (const app of apps) {
      const pans = app.numberOfPanCards || app.panNumbers?.length || 1;
      totalPans += pans;
      totalContrib += (Number(app.totalContribution) || 0);
      const expectedContrib = pans * 15000;
      if (Number(app.totalContribution) !== expectedContrib) {
        console.log(`[MISMATCH] App ${app.id} (${app.applicantName || app.applicantUsername}): PANs=${pans}, Stored Contribution=₹${app.totalContribution}, Expected (${pans}*15000)=₹${expectedContrib} (Diff: ₹${Number(app.totalContribution) - expectedContrib})`);
      }
    }

    console.log(`Total PANs: ${totalPans}`);
    console.log(`Total Contribution stored: ₹${totalContrib} (₹${(totalContrib/100000).toFixed(2)} L)`);
    console.log(`Expected (79 * 15000): ₹${79 * 15000} (₹${(79 * 15000 / 100000).toFixed(2)} L)`);
    console.log(`Diff: ₹${totalContrib - (79 * 15000)}`);

    // Check if 81 * 15000 = 12,15,000 (12.15 Lakh)
    console.log(`81 * 15000 = ₹${81 * 15000} (12.15 Lakh)`);

    // Let's check members with contributions
    console.log("\n=== Member by member breakdown for Tempsens Instruments ===");
    const memberMap = new Map();
    for (const app of apps) {
      const user = app.applicantUsername || app.applicantName || app.memberId;
      const pans = app.numberOfPanCards || app.panNumbers?.length || 1;
      const contrib = Number(app.totalContribution) || 0;
      const curr = memberMap.get(user) || { count: 0, pans: 0, contrib: 0 };
      curr.count++;
      curr.pans += pans;
      curr.contrib += contrib;
      memberMap.set(user, curr);
    }

    for (const [user, data] of memberMap.entries()) {
      console.log(`${user.padEnd(25)} | Apps: ${String(data.count).padStart(2)} | PANs/Lots: ${String(data.pans).padStart(2)} | Total Contribution: ₹${data.contrib.toLocaleString("en-IN")}`);
    }

  } finally {
    await client.close();
  }
}

main().catch(console.error);
