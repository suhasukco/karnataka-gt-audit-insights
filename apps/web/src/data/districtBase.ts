import type { Region } from '@/types'

export interface DistrictBase {
  id: string
  name: string
  region: Region
  headquarters: string
  lat: number
  lng: number
  population: number
  urbanBaseline: number // 0-1, share of population classified urban
  taluks: string[]
}

// lat/lng are approximate district headquarters coordinates, used to lay out
// the Karnataka cartogram in real relative geographic positions.
export const DISTRICT_BASE: DistrictBase[] = [
  { id: 'bagalkot', name: 'Bagalkot', region: 'North Karnataka', headquarters: 'Bagalkot', lat: 16.18, lng: 75.7, population: 1889752, urbanBaseline: 0.28, taluks: ['Bagalkot', 'Badami', 'Bilagi', 'Hunagund', 'Jamakhandi', 'Mudhol'] },
  { id: 'ballari', name: 'Ballari', region: 'North Karnataka', headquarters: 'Ballari', lat: 15.14, lng: 76.92, population: 1489405, urbanBaseline: 0.42, taluks: ['Ballari', 'Siruguppa', 'Sandur', 'Kampli', 'Kurugodu', 'Torangallu'] },
  { id: 'belagavi', name: 'Belagavi', region: 'North Karnataka', headquarters: 'Belagavi', lat: 15.85, lng: 74.5, population: 4779661, urbanBaseline: 0.32, taluks: ['Belagavi', 'Athani', 'Bailhongal', 'Chikkodi', 'Gokak', 'Hukkeri', 'Khanapur', 'Ramdurg', 'Raibag', 'Saundatti'] },
  { id: 'bengaluru-urban', name: 'Bengaluru Urban', region: 'Bengaluru Region', headquarters: 'Bengaluru', lat: 12.97, lng: 77.59, population: 9621551, urbanBaseline: 0.91, taluks: ['Bengaluru North', 'Bengaluru South', 'Bengaluru East', 'Anekal'] },
  { id: 'bengaluru-rural', name: 'Bengaluru Rural', region: 'Bengaluru Region', headquarters: 'Devanahalli', lat: 13.24, lng: 77.5, population: 990923, urbanBaseline: 0.34, taluks: ['Devanahalli', 'Doddaballapura', 'Hoskote', 'Nelamangala'] },
  { id: 'bidar', name: 'Bidar', region: 'North Karnataka', headquarters: 'Bidar', lat: 17.91, lng: 77.52, population: 1703300, urbanBaseline: 0.31, taluks: ['Bidar', 'Aurad', 'Basavakalyan', 'Bhalki', 'Humnabad'] },
  { id: 'chamarajanagar', name: 'Chamarajanagar', region: 'South Karnataka', headquarters: 'Chamarajanagar', lat: 11.92, lng: 76.94, population: 1020791, urbanBaseline: 0.19, taluks: ['Chamarajanagar', 'Gundlupet', 'Kollegal', 'Yelandur'] },
  { id: 'chikkaballapura', name: 'Chikkaballapura', region: 'South Karnataka', headquarters: 'Chikkaballapura', lat: 13.43, lng: 77.73, population: 1255104, urbanBaseline: 0.22, taluks: ['Chikkaballapura', 'Bagepalli', 'Chintamani', 'Gauribidanur', 'Gudibanda', 'Sidlaghatta'] },
  { id: 'chikkamagaluru', name: 'Chikkamagaluru', region: 'Central Karnataka', headquarters: 'Chikkamagaluru', lat: 13.32, lng: 75.77, population: 1137961, urbanBaseline: 0.24, taluks: ['Chikkamagaluru', 'Kadur', 'Koppa', 'Mudigere', 'Narasimharajapura', 'Sringeri', 'Tarikere'] },
  { id: 'chitradurga', name: 'Chitradurga', region: 'Central Karnataka', headquarters: 'Chitradurga', lat: 14.23, lng: 76.4, population: 1659456, urbanBaseline: 0.27, taluks: ['Chitradurga', 'Challakere', 'Hiriyur', 'Holalkere', 'Hosadurga', 'Molakalmuru'] },
  { id: 'dakshina-kannada', name: 'Dakshina Kannada', region: 'Coastal Karnataka', headquarters: 'Mangaluru', lat: 12.87, lng: 74.88, population: 2089649, urbanBaseline: 0.47, taluks: ['Mangaluru', 'Bantwal', 'Belthangady', 'Puttur', 'Sullia'] },
  { id: 'davanagere', name: 'Davanagere', region: 'Central Karnataka', headquarters: 'Davanagere', lat: 14.46, lng: 75.92, population: 1945497, urbanBaseline: 0.38, taluks: ['Davanagere', 'Channagiri', 'Harihar', 'Honnali', 'Jagalur', 'Nyamathi'] },
  { id: 'dharwad', name: 'Dharwad', region: 'North Karnataka', headquarters: 'Hubballi-Dharwad', lat: 15.46, lng: 75.0, population: 1847023, urbanBaseline: 0.58, taluks: ['Dharwad', 'Hubballi', 'Kalghatgi', 'Kundgol', 'Navalgund'] },
  { id: 'gadag', name: 'Gadag', region: 'North Karnataka', headquarters: 'Gadag', lat: 15.43, lng: 75.63, population: 1064570, urbanBaseline: 0.33, taluks: ['Gadag', 'Mundargi', 'Nargund', 'Ron', 'Shirahatti'] },
  { id: 'hassan', name: 'Hassan', region: 'South Karnataka', headquarters: 'Hassan', lat: 13.0, lng: 76.1, population: 1776421, urbanBaseline: 0.22, taluks: ['Hassan', 'Arkalgud', 'Alur', 'Arasikere', 'Belur', 'Channarayapatna', 'Holenarasipura', 'Sakleshpur'] },
  { id: 'haveri', name: 'Haveri', region: 'North Karnataka', headquarters: 'Haveri', lat: 14.79, lng: 75.4, population: 1597668, urbanBaseline: 0.26, taluks: ['Haveri', 'Byadagi', 'Hangal', 'Hirekerur', 'Ranebennur', 'Savanur', 'Shiggaon'] },
  { id: 'kalaburagi', name: 'Kalaburagi', region: 'North Karnataka', headquarters: 'Kalaburagi', lat: 17.33, lng: 76.84, population: 2566326, urbanBaseline: 0.36, taluks: ['Kalaburagi', 'Afzalpur', 'Aland', 'Chincholi', 'Chittapur', 'Jevargi', 'Sedam'] },
  { id: 'kodagu', name: 'Kodagu', region: 'South Karnataka', headquarters: 'Madikeri', lat: 12.42, lng: 75.74, population: 554519, urbanBaseline: 0.21, taluks: ['Madikeri', 'Somwarpet', 'Virajpet'] },
  { id: 'kolar', name: 'Kolar', region: 'South Karnataka', headquarters: 'Kolar', lat: 13.14, lng: 78.13, population: 1536401, urbanBaseline: 0.27, taluks: ['Kolar', 'Bangarapet', 'Malur', 'Mulbagal', 'Srinivaspur'] },
  { id: 'koppal', name: 'Koppal', region: 'North Karnataka', headquarters: 'Koppal', lat: 15.35, lng: 76.15, population: 1389920, urbanBaseline: 0.24, taluks: ['Koppal', 'Gangavathi', 'Kushtagi', 'Yelbarga', 'Kanakagiri'] },
  { id: 'mandya', name: 'Mandya', region: 'South Karnataka', headquarters: 'Mandya', lat: 12.52, lng: 76.9, population: 1808680, urbanBaseline: 0.2, taluks: ['Mandya', 'Krishnarajpet', 'Maddur', 'Malavalli', 'Nagamangala', 'Pandavapura', 'Srirangapatna'] },
  { id: 'mysuru', name: 'Mysuru', region: 'South Karnataka', headquarters: 'Mysuru', lat: 12.3, lng: 76.65, population: 3001127, urbanBaseline: 0.48, taluks: ['Mysuru', 'Hunsur', 'Krishnarajanagara', 'Nanjangud', 'Periyapatna', 'Saligrama', 'T Narasipura'] },
  { id: 'raichur', name: 'Raichur', region: 'North Karnataka', headquarters: 'Raichur', lat: 16.21, lng: 77.36, population: 1928812, urbanBaseline: 0.28, taluks: ['Raichur', 'Devadurga', 'Lingsugur', 'Manvi', 'Sindhanur'] },
  { id: 'ramanagara', name: 'Ramanagara', region: 'Bengaluru Region', headquarters: 'Ramanagara', lat: 12.72, lng: 77.28, population: 1082636, urbanBaseline: 0.25, taluks: ['Ramanagara', 'Channapatna', 'Kanakapura', 'Magadi'] },
  { id: 'shivamogga', name: 'Shivamogga', region: 'Central Karnataka', headquarters: 'Shivamogga', lat: 13.93, lng: 75.57, population: 1755512, urbanBaseline: 0.36, taluks: ['Shivamogga', 'Bhadravathi', 'Hosanagara', 'Sagara', 'Shikaripura', 'Sorab', 'Thirthahalli'] },
  { id: 'tumakuru', name: 'Tumakuru', region: 'South Karnataka', headquarters: 'Tumakuru', lat: 13.34, lng: 77.1, population: 2678980, urbanBaseline: 0.28, taluks: ['Tumakuru', 'Gubbi', 'Koratagere', 'Kunigal', 'Madhugiri', 'Pavagada', 'Sira', 'Tiptur'] },
  { id: 'udupi', name: 'Udupi', region: 'Coastal Karnataka', headquarters: 'Udupi', lat: 13.34, lng: 74.75, population: 1177361, urbanBaseline: 0.34, taluks: ['Udupi', 'Karkala', 'Kundapura'] },
  { id: 'uttara-kannada', name: 'Uttara Kannada', region: 'Coastal Karnataka', headquarters: 'Karwar', lat: 14.8, lng: 74.13, population: 1437169, urbanBaseline: 0.29, taluks: ['Karwar', 'Ankola', 'Bhatkal', 'Haliyal', 'Honnavar', 'Kumta', 'Mundgod', 'Siddapur', 'Yellapur'] },
  { id: 'vijayapura', name: 'Vijayapura', region: 'North Karnataka', headquarters: 'Vijayapura', lat: 16.83, lng: 75.71, population: 2177331, urbanBaseline: 0.3, taluks: ['Vijayapura', 'Basavana Bagewadi', 'Indi', 'Muddebihal', 'Sindagi'] },
  { id: 'yadgir', name: 'Yadgir', region: 'North Karnataka', headquarters: 'Yadgir', lat: 16.77, lng: 77.14, population: 1174271, urbanBaseline: 0.21, taluks: ['Yadgir', 'Shahapur', 'Shorapur'] },
  { id: 'vijayanagara', name: 'Vijayanagara', region: 'North Karnataka', headquarters: 'Hosapete', lat: 15.27, lng: 76.4, population: 1489000, urbanBaseline: 0.31, taluks: ['Hosapete', 'Hagaribommanahalli', 'Harapanahalli', 'Hadagalli', 'Kottur'] },
]

export const TOTAL_TALUKS = DISTRICT_BASE.reduce((sum, d) => sum + d.taluks.length, 0)
