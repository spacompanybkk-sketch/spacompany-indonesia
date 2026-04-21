import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

export const migrateTherapists = onCall(
  { timeoutSeconds: 300, invoker: "public" },
  async (request) => {
    const { callerEmail } = request.data;
    const db = getFirestore();

    // Check caller is an approver (try both field names)
    const approversDoc = await db.doc("config/approvers").get();
    const data = approversDoc.exists ? approversDoc.data() : {};
    const approvers = data.approverEmails || data.emails || data.approveremails || [];
    // Also accept if array contains objects or is flat
    const approverList = Array.isArray(approvers) ? approvers.map(e => typeof e === 'string' ? e : '') : [];
    console.log("Approvers found:", JSON.stringify(approverList));
    console.log("Caller email:", callerEmail);
    if (!callerEmail || !approverList.includes(callerEmail)) {
      throw new HttpsError("permission-denied", `Only approvers can run migration. Found: ${JSON.stringify(approverList)}, caller: ${callerEmail}`);
    }

    const therapistsSnap = await db.collection("therapists").get();
    const results = { migrated: 0, skipped: 0, errors: [] };

    for (const doc of therapistsSnap.docs) {
      try {
        const t = doc.data();

        const candidateNum = t.wpUserId || t.candidateNum || null;
        const candidateId = candidateNum ? `SC-${candidateNum}` : null;
        if (!candidateId) {
          results.skipped++;
          continue;
        }

        // Check if already migrated
        const existing = await db.collection("candidates")
          .where("candidateId", "==", candidateId)
          .limit(1)
          .get();
        if (!existing.empty) {
          results.skipped++;
          continue;
        }

        // Approximate DOB from age
        const age = parseInt(t.age) || null;
        const approxDob = age ? `${new Date().getFullYear() - age}-01-01` : null;

        const candidate = {
          candidateId,
          fullName: t.name || "",
          firstName: t.name || "",
          lastName: "",
          dateOfBirth: approxDob,
          placeOfBirth: t.location || null,
          nationality: "Thailand",
          originCountry: "Thailand",
          gender: t.gender || null,
          maritalStatus: null,
          jobPosition: "Massage",
          experience: t.experience ? `${t.experience} years` : null,
          education: null,
          englishLevel: null,
          skills: t.skills || [],
          bio: t.bio || "",
          youtubeUrl: t.youtubeUrl || null,
          workHistory: (t.workHistory || []).map((w) => ({
            role: w.role || "",
            location: w.location || "",
            duration: w.duration || "",
            duties: Array.isArray(w.duties)
              ? w.duties
              : (w.duties || "").split("\n").filter(Boolean),
          })),
          ratings: {
            communication: t.ratings?.communication || 0,
            appearance: t.ratings?.appearance || 0,
            proActivity: t.ratings?.proactivity || t.ratings?.proActivity || 0,
            experience: t.ratings?.experience || 0,
            jobSkills: t.ratings?.massageSkills || t.ratings?.jobSkills || 0,
          },
          email: null,
          phone: null,
          alternatePhone: null,
          whatsapp: null,
          lineFacebook: null,
          originAddress: t.location || null,
          originAddressLocal: null,
          photos: t.photos || [],
          passportNumber: null,
          passportUrl: null,
          cvUrl: null,
          targetCountry: t.desiredWorkLocation || null,
          status: t.status === "active" ? "published" : "draft",
          createdBy: "migration:therapists",
          createdAt: t.createdAt || new Date(),
          approvedBy: "migration:therapists",
          approvedAt: new Date(),
          notionCandidateUrl: null,
          _migratedFrom: `therapists/${doc.id}`,
        };

        await db.collection("candidates").add(candidate);
        results.migrated++;
      } catch (e) {
        results.errors.push({ id: doc.id, error: e.message });
      }
    }

    return results;
  }
);
