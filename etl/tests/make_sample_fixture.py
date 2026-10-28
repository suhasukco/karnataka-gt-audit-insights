"""Generates a small synthetic sample (fake data, no real PII) matching the
real 100-column shape, used to smoke-test the ETL pipeline end to end without
needing the real outlet export. Deliberately includes edge cases: flag value
variants (Y/N/Yes/No/blank), out-of-bounds lat/long, an Egg row with no SKU,
an OTC row with no flag column, Personal Care's free-text product type, and
multiple Brands Stocked delimiter styles.
"""

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from etl.columns import RAW_COLUMNS  # noqa: E402

ROWS = [
    {
        "Outlet Name": "Sri Ganesha Stores", "Outlet Type": "Kirana", "Channel": "Retail", "Outlet Class": "B",
        "Outlet Ownership Type": "Proprietor", "Outlet Age": "12",
        "Street Address": "12th Main Road", "Landmark": "Near Bus Stand", "In and Around": "Marathahalli",
        "GPS Location": "12.9569,77.7011", "Latitude": "12.9569", "Longitude": "77.7011",
        "City": "Bengaluru", "Taluka": "Bengaluru East", "District": "Bengaluru Urban", "State": "Karnataka", "Pin Code": "560037",
        "Owner Name": "Ramesh K", "Contact Person": "Ramesh K", "Contact No": "9845012345", "Alternate Contact No": "",
        "Key Person": "Ramesh K", "Key Person Phone No": "919845012345", "Email Address": "ramesh@example.com", "GST No": "29ABCDE1234F1Z5",
        "Shutters Count": "2", "Name Board": "Y", "Fridge Flag": "Y", "Fridge Count": "1", "Cooler Flag": "N", "Cooler Count": "0",
        "Deep Freezer Flag": "N", "Deep Freezer Count": "0", "Display Rack Flag": "Y", "Display Rack Count": "3",
        "Chips Stand Flag": "Y", "Hanger Flag": "N", "Cash Counter Display": "Y", "Cash Counter Count": "1",
        "Poster Dangler Flag": "Y", "Promoter Flag": "N", "Sampling Area Flag": "N", "AC Flag": "N",
        "Employee Count": "2", "Sales Monthly Avg": "150000", "Billing Software Flag": "N", "Digital Payment Accepted": "Y",
        "Card Accepted": "N", "Gift Coupon Sodexo Flag": "N", "Door Delivery Flag": "Y", "Online Sales Flag": "N",
        "Company Tieup Flag": "N", "B2B Purchase Flag": "N", "Sale Option": "Cash", "Purchase Option": "Distributor",
        "Outlet Related Remarks": "Regular outlet",
        "Branded Staple Category Flag": "Y", "Branded Staple Prod Types": "Atta, Rice, Dal",
        "Atta Flour Flag": "Y", "Atta Flours SKU": "5", "Dal Pulses Flag": "Y", "Dals Pulses SKU": "8",
        "Rice Flag": "Y", "Rice SKU": "6", "Dry Fruits Flag": "N", "Dryfruits Nuts SKU": "0",
        "Papad Flag": "Y", "Papad SKU": "3", "Fruit Juice Flag": "Y", "Fruit Juice Drinks SKU": "4",
        "Masala Mix Flag": "Y", "Masal Mixes SKU": "10", "Snacks Flag": "Y", "Snacks SKU": "20",
        "Spreads Sauce Flag": "N", "Spreads Sauces SKU": "0", "Beverage Flag": "Y", "Beverages SKU": "12",
        "Egg Flag": "Y", "Health Mix Flag": "N", "Health Mix SKU": "0", "Stationery Flag": "Y", "Stationery SKU": "6",
        "Personal Care Flag": "Y", "Personal Care Product Type": "Soap, Shampoo, Talcum Powder",
        "Home Care Flag": "Y", "Home Care SKU": "5", "Frozen Food Flag": "N", "Frozen Food SKU": "0",
        "Cadbury Display Flag": "Y", "Vegetable Flag": "N", "Vegetables SKU": "0",
        "Pooja Category Flag": "Y", "Pooja Category SKU": "4", "Ready to Cook Flag": "N", "Ready Cook SKU": "0",
        "Milk Products Flag": "Y", "Milk Products SKU": "6", "OTC Products SKU": "3",
        "Brands Stocked": "Amul, Britannia and Parle",
    },
    {
        "Outlet Name": "New Bombay Supermarket", "Outlet Type": "Super Market", "Channel": "Modern Trade", "Outlet Class": "A",
        "Outlet Ownership Type": "Private Ltd", "Outlet Age": "5",
        "Street Address": "MG Road", "Landmark": "Opp Metro Station", "In and Around": "MG Road",
        "GPS Location": "12.9756,77.6068", "Latitude": "12.9756", "Longitude": "77.6068",
        "City": "Bengaluru", "Taluka": "Bengaluru East", "District": "Bengaluru Urban", "State": "Karnataka", "Pin Code": "560001",
        "Owner Name": "Priya Enterprises Pvt Ltd", "Contact Person": "Suresh M", "Contact No": "08041234567", "Alternate Contact No": "9900011122",
        "Key Person": "Suresh M", "Key Person Phone No": "9900011122", "Email Address": "info@newbombay.example", "GST No": "29XYZAB5678C1Z9",
        "Shutters Count": "4", "Name Board": "Yes", "Fridge Flag": "Yes", "Fridge Count": "3", "Cooler Flag": "Yes", "Cooler Count": "2",
        "Deep Freezer Flag": "Yes", "Deep Freezer Count": "2", "Display Rack Flag": "Yes", "Display Rack Count": "15",
        "Chips Stand Flag": "Yes", "Hanger Flag": "Yes", "Cash Counter Display": "Yes", "Cash Counter Count": "3",
        "Poster Dangler Flag": "Yes", "Promoter Flag": "Yes", "Sampling Area Flag": "Yes", "AC Flag": "Yes",
        "Employee Count": "15", "Sales Monthly Avg": "2500000", "Billing Software Flag": "Yes", "Digital Payment Accepted": "Yes",
        "Card Accepted": "Yes", "Gift Coupon Sodexo Flag": "Yes", "Door Delivery Flag": "Yes", "Online Sales Flag": "Yes",
        "Company Tieup Flag": "Yes", "B2B Purchase Flag": "No", "Sale Option": "Cash & Credit", "Purchase Option": "Direct from Company",
        "Outlet Related Remarks": "",
        "Branded Staple Category Flag": "Yes", "Branded Staple Prod Types": "Premium Atta, Basmati Rice",
        "Atta Flour Flag": "Yes", "Atta Flours SKU": "12", "Dal Pulses Flag": "Yes", "Dals Pulses SKU": "18",
        "Rice Flag": "Yes", "Rice SKU": "14", "Dry Fruits Flag": "Yes", "Dryfruits Nuts SKU": "10",
        "Papad Flag": "Yes", "Papad SKU": "6", "Fruit Juice Flag": "Yes", "Fruit Juice Drinks SKU": "20",
        "Masala Mix Flag": "Yes", "Masal Mixes SKU": "15", "Snacks Flag": "Yes", "Snacks SKU": "40",
        "Spreads Sauce Flag": "Yes", "Spreads Sauces SKU": "12", "Beverage Flag": "Yes", "Beverages SKU": "30",
        "Egg Flag": "No", "Health Mix Flag": "Yes", "Health Mix SKU": "8", "Stationery Flag": "Yes", "Stationery SKU": "10",
        "Personal Care Flag": "Yes", "Personal Care Product Type": "Full range: soap, shampoo, cosmetics, oral care",
        "Home Care Flag": "Yes", "Home Care SKU": "18", "Frozen Food Flag": "Yes", "Frozen Food SKU": "12",
        "Cadbury Display Flag": "Yes", "Vegetable Flag": "Yes", "Vegetables SKU": "25",
        "Pooja Category Flag": "Yes", "Pooja Category SKU": "10", "Ready to Cook Flag": "Yes", "Ready Cook SKU": "8",
        "Milk Products Flag": "Yes", "Milk Products SKU": "16", "OTC Products SKU": "22",
        "Brands Stocked": "amul; ITC/Nestle/Britannia",
    },
    {
        "Outlet Name": "Malnad Medicals", "Outlet Type": "Pharmacy", "Channel": "Retail", "Outlet Class": "C",
        "Outlet Ownership Type": "Proprietor", "Outlet Age": "8",
        "Street Address": "Temple Street", "Landmark": "", "In and Around": "Town Center",
        "GPS Location": "13.9299,75.5681", "Latitude": "999", "Longitude": "999",  # out of bounds, should be nulled
        "City": "Shivamogga", "Taluka": "Shivamogga", "District": "Shivamogga", "State": "Karnataka", "Pin Code": "577201",
        "Owner Name": "Lakshmi Devi", "Contact Person": "Lakshmi Devi", "Contact No": "9900000000", "Alternate Contact No": "",
        "Key Person": "", "Key Person Phone No": "", "Email Address": "", "GST No": "",
        "Shutters Count": "1", "Name Board": "N", "Fridge Flag": "Y", "Fridge Count": "1", "Cooler Flag": "N", "Cooler Count": "0",
        "Deep Freezer Flag": "N", "Deep Freezer Count": "0", "Display Rack Flag": "Y", "Display Rack Count": "2",
        "Chips Stand Flag": "N", "Hanger Flag": "N", "Cash Counter Display": "N", "Cash Counter Count": "0",
        "Poster Dangler Flag": "N", "Promoter Flag": "N", "Sampling Area Flag": "N", "AC Flag": "N",
        "Employee Count": "1", "Sales Monthly Avg": "80000", "Billing Software Flag": "N", "Digital Payment Accepted": "N",
        "Card Accepted": "N", "Gift Coupon Sodexo Flag": "N", "Door Delivery Flag": "N", "Online Sales Flag": "N",
        "Company Tieup Flag": "N", "B2B Purchase Flag": "N", "Sale Option": "Cash", "Purchase Option": "Wholesaler",
        "Outlet Related Remarks": "Small pharmacy, no OTC flag column recorded",
        "Branded Staple Category Flag": "N", "Branded Staple Prod Types": "",
        "Atta Flour Flag": "N", "Atta Flours SKU": "0", "Dal Pulses Flag": "N", "Dals Pulses SKU": "0",
        "Rice Flag": "N", "Rice SKU": "0", "Dry Fruits Flag": "N", "Dryfruits Nuts SKU": "0",
        "Papad Flag": "N", "Papad SKU": "0", "Fruit Juice Flag": "N", "Fruit Juice Drinks SKU": "0",
        "Masala Mix Flag": "N", "Masal Mixes SKU": "0", "Snacks Flag": "N", "Snacks SKU": "0",
        "Spreads Sauce Flag": "N", "Spreads Sauces SKU": "0", "Beverage Flag": "N", "Beverages SKU": "0",
        "Egg Flag": "N", "Health Mix Flag": "N", "Health Mix SKU": "0", "Stationery Flag": "N", "Stationery SKU": "0",
        "Personal Care Flag": "N", "Personal Care Product Type": "",
        "Home Care Flag": "N", "Home Care SKU": "0", "Frozen Food Flag": "N", "Frozen Food SKU": "0",
        "Cadbury Display Flag": "N", "Vegetable Flag": "N", "Vegetables SKU": "0",
        "Pooja Category Flag": "N", "Pooja Category SKU": "0", "Ready to Cook Flag": "N", "Ready Cook SKU": "0",
        "Milk Products Flag": "N", "Milk Products SKU": "0", "OTC Products SKU": "35",
        "Brands Stocked": "Cipla | Sun Pharma",
    },
]


def main() -> None:
    df = pd.DataFrame(ROWS)
    df = df.reindex(columns=RAW_COLUMNS)
    out_path = Path(__file__).parent / "fixtures" / "sample_outlets.xlsx"
    df.to_excel(out_path, index=False)
    print(f"Wrote {len(df)} sample rows to {out_path}")


if __name__ == "__main__":
    main()
