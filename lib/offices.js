/** PRO4A CALABARZON offices + stations — keep in sync with patrollers/lib/data/office_station_map.dart */
export const officeStationMap = {
  "Cavite PPO": [
    "Alfonso MPS",
    "Amadeo MPS",
    "Bacoor CCPS",
    "Carmona CCPS",
    "Cavite CCPS",
    "Dasmariñas CCPS",
    "Gen. Emilio Aguinaldo MPS",
    "Gen. Mariano Alvarez MPS",
    "Gen. Trias CCPS",
    "Imus CCPS",
    "Indang MPS",
    "Kawit MPS",
    "Magallanes MPS",
    "Maragondon MPS",
    "Mendez MPS",
    "Naic MPS",
    "Noveleta MPS",
    "Rosario MPS",
    "Silang MPS",
    "Tagaytay CCPS",
    "Tanza MPS",
    "Ternate MPS",
    "Trece Martires CCPS",
  ],
  "Laguna PPO": [
    "Alaminos MPS",
    "Bay MPS",
    "Biñan CCPS",
    "Cabuyao CCPS",
    "Calamba CCPS",
    "Calauan MPS",
    "Cavinti MPS",
    "Kalayaan MPS",
    "Liliw MPS",
    "Los Baños MPS",
    "Luisiana MPS",
    "Lumban MPS",
    "Mabitac MPS",
    "Magdalena MPS",
    "Majayjay MPS",
    "Nagcarlan MPS",
    "Paete MPS",
    "Pagsanjan MPS",
    "Pakil MPS",
    "Pangil MPS",
    "Pila MPS",
    "Rizal MPS",
    "San Pablo CCPS",
    "San Pedro CCPS",
    "Santa Cruz MPS",
    "Santa Maria MPS",
    "Santa Rosa CCPS",
    "Siniloan MPS",
    "Victoria MPS",
  ],
  "Batangas PPO": [
    "Agoncillo MPS",
    "Alitagtag MPS",
    "Balayan MPS",
    "Balete MPS",
    "Batangas CCPS",
    "Bauan MPS",
    "Calaca CCPS",
    "Calatagan MPS",
    "Cuenca MPS",
    "Ibaan MPS",
    "Laurel MPS",
    "Lemery MPS",
    "Lian MPS",
    "Lipa CCPS",
    "Lobo MPS",
    "Mabini MPS",
    "Malvar MPS",
    "Mataas na Kahoy MPS",
    "Nasugbu MPS",
    "Padre Garcia MPS",
    "Rosario MPS",
    "San Jose MPS",
    "San Juan MPS",
    "San Luis MPS",
    "San Nicolas MPS",
    "San Pascual MPS",
    "Santa Teresita MPS",
    "Santo Tomas CCPS",
    "Taal MPS",
    "Talisay MPS",
    "Tanauan CCPS",
    "Taysan MPS",
    "Tingloy MPS",
    "Tuy MPS",
  ],
  "Rizal PPO": [
    "Angono MPS",
    "Antipolo CCPS",
    "Baras MPS",
    "Binangonan MPS",
    "Cainta MPS",
    "Cardona MPS",
    "Jalajala MPS",
    "Morong MPS",
    "Pililla MPS",
    "Rodriguez MPS",
    "San Mateo MPS",
    "Tanay MPS",
    "Taytay MPS",
    "Teresa MPS",
  ],
  "Quezon PPO": [
    "Agdangan MPS",
    "Atimonan MPS",
    "Buenavista MPS",
    "Burdeos MPS",
    "Calauag MPS",
    "Candelaria MPS",
    "Catanauan MPS",
    "Dolores MPS",
    "Famy MPS",
    "General Luna MPS",
    "General Nakar MPS",
    "Guinayangan MPS",
    "Gumaca MPS",
    "Infanta MPS",
    "Jomalig MPS",
    "Lopez MPS",
    "Lucban MPS",
    "Lucena CCPS",
    "Macalelon MPS",
    "Mauban MPS",
    "Mulanay MPS",
    "Pagbilao MPS",
    "Panukulan MPS",
    "Patnanungan MPS",
    "Polillo MPS",
    "Quezon MPS",
    "Real MPS",
    "Sampaloc MPS",
    "Sariaya MPS",
    "Tagkawayan MPS",
    "Tayabas CCPS",
    "Tiaong MPS",
    "Unisan MPS",
  ],
};

export const officeOptions = Object.keys(officeStationMap);

export function stationsForOffice(office) {
  if (!office) return [];
  return officeStationMap[office] ?? [];
}

export function isKnownOffice(office) {
  return officeOptions.includes(String(office ?? "").trim());
}

export function isKnownUnitForOffice(office, unit) {
  const stations = stationsForOffice(String(office ?? "").trim());
  return stations.includes(String(unit ?? "").trim());
}

/** Include a legacy value in dropdown options when editing older records. */
export function officeSelectOptions(currentValue) {
  const current = String(currentValue ?? "").trim();
  if (current && !officeOptions.includes(current)) {
    return [current, ...officeOptions];
  }
  return officeOptions;
}

export function unitSelectOptions(office, currentValue) {
  const stations = stationsForOffice(office);
  const current = String(currentValue ?? "").trim();
  if (current && !stations.includes(current)) {
    return [current, ...stations];
  }
  return stations;
}
