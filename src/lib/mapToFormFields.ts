/**
 * Map raw OCR-extracted fields to form field IDs.
 * Shared between DocumentVault (desktop) and MobileUpload (phone).
 */
export function mapToFormFields(documentType: string, data: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};

  switch (documentType) {
    case "licenceFront": {
      if (data.firstName) mapped.firstName = data.firstName;
      if (data.surname) mapped.familyName = data.surname;
      if (data.dateOfBirth) {
        if (data.dateOfBirth.includes("-")) {
          const [y, m, d] = data.dateOfBirth.split("-");
          if (d && m && y) mapped.dob = `${d}/${m}/${y}`;
        } else {
          mapped.dob = data.dateOfBirth;
        }
      }
      if (data.address) {
        const full = [data.address, data.suburb, data.state].filter(Boolean).join(", ");
        mapped.permanentAddress = full || data.address;
      }
      if (data.postcode) mapped.postcode = data.postcode;
      if (data.licenceNumber) mapped.licenceNumber = data.licenceNumber;
      if (data.expiryDate) mapped.licenceExpiry = data.expiryDate;
      if (data.gender) {
        mapped.gender = data.gender;
        if (data.gender === "Male") mapped.title = "Mr";
        else if (data.gender === "Female") mapped.title = "Ms";
      }
      break;
    }
    case "licenceBack": {
      if (data.address) mapped.permanentAddress = data.address;
      if (data.licenceNumber) mapped.licenceNumber = data.licenceNumber;
      break;
    }
    case "passport": {
      if (data.firstName) mapped.passport_firstName = data.firstName;
      if (data.surname) mapped.passport_familyName = data.surname;
      if (data.dateOfBirth) {
        if (data.dateOfBirth.includes("-")) {
          const [y, m, d] = data.dateOfBirth.split("-");
          if (d && m && y) mapped.passport_dob = `${d}/${m}/${y}`;
        } else {
          mapped.passport_dob = data.dateOfBirth;
        }
      }
      if (data.passportNumber) mapped.passportNumber = data.passportNumber;
      if (data.nationality) mapped.nationality = data.nationality;
      if (data.expiryDate) mapped.passportExpiry = data.expiryDate;
      if (data.gender) mapped.passport_gender = data.gender;
      if (data.nationality) {
        const nat = data.nationality.toLowerCase();
        if (nat.includes("austral")) {
          mapped.australianCitizen = "Yes";
          mapped.currentCountry = "Australia";
        }
      }
      if (data.placeOfBirth || data.countryOfBirth) {
        const birthPlace = (data.placeOfBirth || data.countryOfBirth || "").toLowerCase();
        mapped.countryOfBirth = data.placeOfBirth || data.countryOfBirth || "";
        if (birthPlace.includes("austral")) {
          mapped.australianCitizenBornHere = "Yes";
        }
      }
      if (data.firstName) mapped.firstName = data.firstName;
      if (data.surname) mapped.familyName = data.surname;
      if (data.dateOfBirth) {
        if (data.dateOfBirth.includes("-")) {
          const [y, m, d] = data.dateOfBirth.split("-");
          if (d && m && y) mapped.dob = `${d}/${m}/${y}`;
        } else {
          mapped.dob = data.dateOfBirth;
        }
      }
      if (data.gender) {
        mapped.gender = data.gender;
        if (data.gender === "Male") mapped.title = "Mr";
        else if (data.gender === "Female") mapped.title = "Ms";
      }
      break;
    }
    case "medicareCard": {
      if (data.medicareNumber) mapped.medicareNumber = data.medicareNumber;
      break;
    }
    case "centrelinkCard": {
      if (data.crn) mapped.crn = data.crn;
      break;
    }
    case "bankStatement": {
      if (data.bsbNumber) mapped.bankBSB = data.bsbNumber;
      if (data.accountNumber) mapped.bankAccountNumber = data.accountNumber;
      if (data.accountName) mapped.bankAccountName = data.accountName;
      if (data.bankName) mapped.bankName = data.bankName;
      break;
    }
    case "taxReturn": {
      if (data.taxFileNumber) mapped.taxFileNumber = data.taxFileNumber;
      if (data.crn) mapped.crn = data.crn;
      if (data.address) mapped.permanentAddress = data.address;
      break;
    }
    case "medicalReport": {
      if (data.primaryCondition) mapped.primaryCondition = data.primaryCondition;
      if (data.otherConditions) mapped.otherConditions = data.otherConditions;
      if (data.treatingDoctor) mapped.treatingDoctor = data.treatingDoctor;
      if (data.doctorAddress) mapped.doctorAddress = data.doctorAddress;
      if (data.doctorPhone) mapped.doctorPhone = data.doctorPhone;
      if (data.conditionStartDate) mapped.conditionStartDate = data.conditionStartDate;
      if (data.treatmentDetails) mapped.treatments = data.treatmentDetails;
      break;
    }
    case "leaseAgreement": {
      if (data.rentalAddress) mapped.permanentAddress = data.rentalAddress;
      if (data.rentAmount) mapped.rentAmount = data.rentAmount;
      break;
    }
    case "doctorLetter": {
      if (data.treatingDoctor) mapped.treatingDoctor = data.treatingDoctor;
      if (data.doctorProfession) mapped.doctorProfession = data.doctorProfession;
      if (data.doctorAddress) mapped.doctorAddress = data.doctorAddress;
      if (data.doctorPhone) mapped.doctorPhone = data.doctorPhone;
      if (data.primaryCondition) mapped.primaryCondition = data.primaryCondition;
      if (data.currentTreatment) mapped.currentTreatment = data.currentTreatment;
      break;
    }
    case "partnerLicence": {
      const pFirst = data.partnerFirstName || data.firstName;
      const pFamily = data.partnerFamilyName || data.surname || data.lastName;
      const pDobRaw = data.partnerDob || data.dateOfBirth;
      const pGender = data.partnerGender || data.gender;
      const pAddr = data.partnerAddress || data.address;
      if (pFirst) mapped.partnerFirstName = pFirst;
      if (pFamily) mapped.partnerFamilyName = pFamily;
      if (pDobRaw) {
        if (pDobRaw.includes("-")) {
          const [y, m, d] = pDobRaw.split("-");
          if (d && m && y) mapped.partnerDob = `${d}/${m}/${y}`;
        } else { mapped.partnerDob = pDobRaw; }
      }
      if (pAddr) {
        const full = [pAddr, data.suburb, data.state].filter(Boolean).join(", ");
        mapped.partnerAddress = full || pAddr;
        if (data.postcode) mapped.partnerPostcode = data.postcode;
      }
      if (pGender) mapped.partnerGender = pGender;
      break;
    }
    case "partnerPassport": {
      const pFirst = data.partnerFirstName || data.firstName;
      const pFamily = data.partnerFamilyName || data.surname || data.lastName;
      const pDobRaw = data.partnerDob || data.dateOfBirth;
      const pGender = data.partnerGender || data.gender;
      const pCob = data.partnerCountryOfBirth || data.countryOfBirth || data.placeOfBirth;
      if (pFirst) mapped.partnerFirstName = pFirst;
      if (pFamily) mapped.partnerFamilyName = pFamily;
      if (pDobRaw) {
        if (pDobRaw.includes("-")) {
          const [y, m, d] = pDobRaw.split("-");
          if (d && m && y) mapped.partnerDob = `${d}/${m}/${y}`;
        } else { mapped.partnerDob = pDobRaw; }
      }
      if (pGender) mapped.partnerGender = pGender;
      if (pCob) mapped.partnerCountryOfBirth = pCob;
      break;
    }
    case "separationCertificate": {
      if (data.employerName) mapped.employerLastYear = data.employerName;
      if (data.separationDate) mapped.separationDate = data.separationDate;
      break;
    }
    case "taxLetter": {
      if (data.taxFileNumber) mapped.tfnNumber = data.taxFileNumber;
      if (data.crn) mapped.crn = data.crn;
      if (data.address) mapped.permanentAddress = data.address;
      break;
    }
    case "superStatement": {
      if (data.superFundName) mapped.superFundName = data.superFundName;
      if (data.superBalance) mapped.superBalance = data.superBalance;
      break;
    }
    case "birthCertificate": {
      if (data.firstName) mapped.firstName = data.firstName;
      if (data.surname) mapped.familyName = data.surname;
      if (data.dateOfBirth) mapped.dob = data.dateOfBirth;
      if (data.countryOfBirth) mapped.countryOfBirth = data.countryOfBirth;
      if (data.placeOfBirth) mapped.placeOfBirth = data.placeOfBirth;
      break;
    }
    case "marriageCertificate": {
      if (data.marriageDate) mapped.relationshipDate = data.marriageDate;
      if (data.relationshipType) mapped.relationshipStatus = data.relationshipType.includes("de facto") ? "De facto" : "Married";
      break;
    }
    case "hospitalDischarge": {
      if (data.primaryCondition) mapped.primaryCondition = data.primaryCondition;
      if (data.diagnoses) mapped.otherConditions = data.diagnoses;
      if (data.treatingDoctor) mapped.treatingDoctor = data.treatingDoctor;
      if (data.hospital) mapped.hospitalDetails = data.hospital;
      if (data.currentTreatment) mapped.currentTreatment = data.currentTreatment;
      break;
    }
    case "medicationList": {
      if (data.medications) mapped.currentTreatment = data.medications;
      if (data.prescribingDoctor) mapped.treatingDoctor = data.prescribingDoctor;
      if (data.doctorPhone) mapped.doctorPhone = data.doctorPhone;
      if (data.practiceAddress) mapped.doctorAddress = data.practiceAddress;
      break;
    }
    case "programOfSupportCert": {
      if (data.providerName) mapped.programProvider = data.providerName;
      if (data.endDate) mapped.programEndDate = data.endDate;
      mapped.programOfSupport = "Yes";
      break;
    }
    case "workersCompLetter": {
      if (data.weeklyAmount) mapped.compensationAmount = data.weeklyAmount;
      if (data.condition) mapped.primaryCondition = mapped.primaryCondition || data.condition;
      mapped.gettingWorkersComp = "Yes";
      break;
    }
    case "careRecipientId": {
      if (data.careRecipientFirstName) mapped.careRecipientFirstName = data.careRecipientFirstName;
      if (data.careRecipientFamilyName) mapped.careRecipientFamilyName = data.careRecipientFamilyName;
      if (data.careRecipientDob) mapped.careRecipientDob = data.careRecipientDob;
      break;
    }
    case "careRecipientMedical": {
      if (data.careRecipientCondition) mapped.careRecipientCondition = data.careRecipientCondition;
      if (data.careRecipientDoctor) mapped.careRecipientDoctor = data.careRecipientDoctor;
      break;
    }
    case "ndisLetter": {
      if (data.ndisNumber) mapped.ndisNumber = data.ndisNumber;
      if (data.disabilityType) mapped.primaryCondition = mapped.primaryCondition || data.disabilityType;
      break;
    }
    case "investmentStatement": {
      if (data.totalValue) mapped.sharesValue = data.totalValue;
      if (data.fundName) mapped.investmentFundName = data.fundName;
      if (data.totalValue) mapped.hasShares = "Yes";
      break;
    }
    case "ratesNotice": {
      if (data.propertyAddress) mapped.propertyAddress = data.propertyAddress;
      if (data.ownerName) mapped.propertyOwnerName = data.ownerName;
      mapped.ownHomeNotLiving = "Yes";
      break;
    }
    case "citizenshipCert": {
      if (data.dateGranted || data.grantDate) mapped.citizenshipDate = data.dateGranted || data.grantDate || "";
      if (data.countryOfBirth) mapped.countryOfBirth = data.countryOfBirth;
      if (data.certificateNumber) mapped.citizenshipNumber = data.certificateNumber;
      if (data.firstName) mapped.firstName = mapped.firstName || data.firstName;
      if (data.surname) mapped.familyName = mapped.familyName || data.surname;
      mapped.australianCitizen = "Yes";
      mapped.australianCitizenBornHere = "No";
      break;
    }
    case "partnerVisaLetter": {
      if (data.visaClass || data.visaSubclass) mapped.partnerVisaType = data.visaClass || data.visaSubclass || "";
      if (data.visaGrantDate) mapped.partnerVisaGrantDate = data.visaGrantDate;
      if (data.visaExpiryDate) mapped.partnerVisaExpiryDate = data.visaExpiryDate;
      if (data.firstName) mapped.partnerFirstName = mapped.partnerFirstName || data.firstName;
      if (data.surname) mapped.partnerFamilyName = mapped.partnerFamilyName || data.surname;
      mapped.partnerAustralianCitizen = "No";
      break;
    }
    case "incomeProtectionLetter": {
      if (data.weeklyAmount || data.monthlyAmount || data.amount) {
        mapped.incomeProtectionAmount = data.weeklyAmount || data.monthlyAmount || data.amount || "";
      }
      if (data.insurerName || data.insurer) mapped.incomeProtectionInsurer = data.insurerName || data.insurer || "";
      if (data.policyNumber) mapped.incomeProtectionPolicy = data.policyNumber;
      mapped.getsIncomeProtection = "Yes";
      break;
    }
    case "vehicleRegistration": {
      if (data.make || data.model) mapped.vehicleDescription = [data.make, data.model, data.year].filter(Boolean).join(" ");
      if (data.registrationNumber) mapped.vehicleRego = data.registrationNumber;
      if (data.marketValue || data.value) mapped.vehicleValue = data.marketValue || data.value || "";
      mapped.hasVehicle = "Yes";
      break;
    }
    case "redundancyLetter": {
      if (data.redundancyAmount || data.amount) mapped.redundancyAmount = data.redundancyAmount || data.amount || "";
      if (data.terminationDate || data.separationDate) mapped.terminationDate = data.terminationDate || data.separationDate || "";
      if (data.employerName) mapped.lastEmployerName = mapped.lastEmployerName || data.employerName;
      mapped.receivedRedundancy = "Yes";
      break;
    }
    case "visaGrantLetter": {
      if (data.visaClass || data.visaSubclass) mapped.visaType = data.visaClass || data.visaSubclass || "";
      if (data.visaGrantDate) mapped.visaGrantDate = data.visaGrantDate;
      if (data.visaExpiryDate) mapped.visaExpiryDate = data.visaExpiryDate;
      if (data.clientName || data.firstName) mapped.firstName = mapped.firstName || data.clientName || data.firstName || "";
      break;
    }
  }

  return Object.fromEntries(Object.entries(mapped).filter(([, v]) => v && v.trim() !== ""));
}
