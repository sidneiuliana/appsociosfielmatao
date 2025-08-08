#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Product Management System
Tests all backend functionality including CRUD operations, QR codes, tickets, and stock control
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://5cbb35e1-e4b7-4365-a186-473197fe43d8.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_results = []
        self.created_products = []
        self.created_tickets = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_connection(self):
        """Test basic API connection"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                self.log_test("API Connection", True, "Successfully connected to backend API")
                return True
            else:
                self.log_test("API Connection", False, f"API returned status {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Connection", False, f"Failed to connect to API: {str(e)}")
            return False
    
    def test_product_creation(self):
        """Test product creation with QR code generation"""
        try:
            # Test data with realistic product information
            product_data = {
                "product_id": f"PROD-{uuid.uuid4().hex[:8].upper()}",
                "name": "Smartphone Samsung Galaxy S24",
                "value": 899.99,
                "stock": 10
            }
            
            response = requests.post(f"{self.base_url}/products", json=product_data, timeout=10)
            
            if response.status_code == 200:
                product = response.json()
                self.created_products.append(product)
                
                # Verify all required fields are present
                required_fields = ["id", "product_id", "name", "value", "stock", "qr_code_data", "qr_code_image"]
                missing_fields = [field for field in required_fields if field not in product]
                
                if missing_fields:
                    self.log_test("Product Creation", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Verify QR code was generated
                if not product.get("qr_code_data") or not product.get("qr_code_image"):
                    self.log_test("Product Creation", False, "QR code not generated")
                    return False
                
                # Verify QR code contains correct data
                expected_qr_data = f"Product: {product_data['name']}\nID: {product_data['product_id']}\nValue: ${product_data['value']}"
                if product["qr_code_data"] != expected_qr_data:
                    self.log_test("Product Creation", False, "QR code data incorrect")
                    return False
                
                self.log_test("Product Creation", True, f"Product created successfully with QR code: {product['product_id']}")
                return True
            else:
                self.log_test("Product Creation", False, f"Failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Product Creation", False, f"Exception: {str(e)}")
            return False
    
    def test_duplicate_product_id(self):
        """Test that duplicate product IDs are rejected"""
        if not self.created_products:
            self.log_test("Duplicate Product ID", False, "No products created to test duplicate")
            return False
            
        try:
            # Try to create product with same product_id
            existing_product = self.created_products[0]
            duplicate_data = {
                "product_id": existing_product["product_id"],
                "name": "Different Product",
                "value": 199.99,
                "stock": 5
            }
            
            response = requests.post(f"{self.base_url}/products", json=duplicate_data, timeout=10)
            
            if response.status_code == 400:
                self.log_test("Duplicate Product ID", True, "Duplicate product ID correctly rejected")
                return True
            else:
                self.log_test("Duplicate Product ID", False, f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Duplicate Product ID", False, f"Exception: {str(e)}")
            return False
    
    def test_get_all_products(self):
        """Test retrieving all products"""
        try:
            response = requests.get(f"{self.base_url}/products", timeout=10)
            
            if response.status_code == 200:
                products = response.json()
                if isinstance(products, list) and len(products) > 0:
                    self.log_test("Get All Products", True, f"Retrieved {len(products)} products")
                    return True
                else:
                    self.log_test("Get All Products", False, "No products returned or invalid format")
                    return False
            else:
                self.log_test("Get All Products", False, f"Failed with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get All Products", False, f"Exception: {str(e)}")
            return False
    
    def test_get_specific_product(self):
        """Test retrieving a specific product"""
        if not self.created_products:
            self.log_test("Get Specific Product", False, "No products created to test")
            return False
            
        try:
            product_id = self.created_products[0]["product_id"]
            response = requests.get(f"{self.base_url}/products/{product_id}", timeout=10)
            
            if response.status_code == 200:
                product = response.json()
                if product["product_id"] == product_id:
                    self.log_test("Get Specific Product", True, f"Retrieved product {product_id}")
                    return True
                else:
                    self.log_test("Get Specific Product", False, "Wrong product returned")
                    return False
            else:
                self.log_test("Get Specific Product", False, f"Failed with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get Specific Product", False, f"Exception: {str(e)}")
            return False
    
    def test_product_update_with_qr_regeneration(self):
        """Test product update and QR code regeneration"""
        if not self.created_products:
            self.log_test("Product Update", False, "No products created to test")
            return False
            
        try:
            product_id = self.created_products[0]["product_id"]
            original_qr = self.created_products[0]["qr_code_data"]
            
            # Update product name and value (should trigger QR regeneration)
            update_data = {
                "name": "iPhone 15 Pro Max",
                "value": 1199.99
            }
            
            response = requests.put(f"{self.base_url}/products/{product_id}", json=update_data, timeout=10)
            
            if response.status_code == 200:
                updated_product = response.json()
                
                # Verify fields were updated
                if updated_product["name"] != update_data["name"] or updated_product["value"] != update_data["value"]:
                    self.log_test("Product Update", False, "Product fields not updated correctly")
                    return False
                
                # Verify QR code was regenerated
                new_qr = updated_product["qr_code_data"]
                if new_qr == original_qr:
                    self.log_test("Product Update", False, "QR code was not regenerated after update")
                    return False
                
                # Update our stored product for future tests
                self.created_products[0] = updated_product
                
                self.log_test("Product Update", True, "Product updated and QR code regenerated")
                return True
            else:
                self.log_test("Product Update", False, f"Failed with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Product Update", False, f"Exception: {str(e)}")
            return False
    
    def test_ticket_creation_with_stock_reduction(self):
        """Test ticket creation and stock reduction"""
        if not self.created_products:
            self.log_test("Ticket Creation", False, "No products created to test")
            return False
            
        try:
            product = self.created_products[0]
            original_stock = product["stock"]
            tickets_to_create = 5
            
            ticket_data = {
                "product_id": product["product_id"],
                "quantity": tickets_to_create
            }
            
            response = requests.post(f"{self.base_url}/tickets", json=ticket_data, timeout=10)
            
            if response.status_code == 200:
                tickets = response.json()
                
                # Verify correct number of tickets created
                if len(tickets) != tickets_to_create:
                    self.log_test("Ticket Creation", False, f"Expected {tickets_to_create} tickets, got {len(tickets)}")
                    return False
                
                # Store tickets for future tests
                self.created_tickets.extend(tickets)
                
                # Verify ticket structure
                for ticket in tickets:
                    required_fields = ["id", "product_id", "product_name", "product_value", "ticket_number", "is_redeemed"]
                    missing_fields = [field for field in required_fields if field not in ticket]
                    if missing_fields:
                        self.log_test("Ticket Creation", False, f"Ticket missing fields: {missing_fields}")
                        return False
                
                # Verify stock was reduced
                updated_product_response = requests.get(f"{self.base_url}/products/{product['product_id']}", timeout=10)
                if updated_product_response.status_code == 200:
                    updated_product = updated_product_response.json()
                    expected_stock = original_stock - tickets_to_create
                    if updated_product["stock"] != expected_stock:
                        self.log_test("Ticket Creation", False, f"Stock not reduced correctly. Expected {expected_stock}, got {updated_product['stock']}")
                        return False
                    
                    # Update our stored product
                    self.created_products[0] = updated_product
                
                self.log_test("Ticket Creation", True, f"Created {tickets_to_create} tickets and reduced stock from {original_stock} to {original_stock - tickets_to_create}")
                return True
            else:
                self.log_test("Ticket Creation", False, f"Failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Ticket Creation", False, f"Exception: {str(e)}")
            return False
    
    def test_insufficient_stock(self):
        """Test ticket creation with insufficient stock"""
        if not self.created_products:
            self.log_test("Insufficient Stock", False, "No products created to test")
            return False
            
        try:
            product = self.created_products[0]
            current_stock = product["stock"]
            
            # Try to create more tickets than available stock
            ticket_data = {
                "product_id": product["product_id"],
                "quantity": current_stock + 1
            }
            
            response = requests.post(f"{self.base_url}/tickets", json=ticket_data, timeout=10)
            
            if response.status_code == 400:
                self.log_test("Insufficient Stock", True, "Insufficient stock correctly rejected")
                return True
            else:
                self.log_test("Insufficient Stock", False, f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Insufficient Stock", False, f"Exception: {str(e)}")
            return False
    
    def test_get_all_tickets(self):
        """Test retrieving all tickets"""
        try:
            response = requests.get(f"{self.base_url}/tickets", timeout=10)
            
            if response.status_code == 200:
                tickets = response.json()
                if isinstance(tickets, list) and len(tickets) > 0:
                    self.log_test("Get All Tickets", True, f"Retrieved {len(tickets)} tickets")
                    return True
                else:
                    self.log_test("Get All Tickets", False, "No tickets returned or invalid format")
                    return False
            else:
                self.log_test("Get All Tickets", False, f"Failed with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get All Tickets", False, f"Exception: {str(e)}")
            return False
    
    def test_get_tickets_by_product(self):
        """Test retrieving tickets for a specific product"""
        if not self.created_products:
            self.log_test("Get Tickets by Product", False, "No products created to test")
            return False
            
        try:
            product_id = self.created_products[0]["product_id"]
            response = requests.get(f"{self.base_url}/tickets/product/{product_id}", timeout=10)
            
            if response.status_code == 200:
                tickets = response.json()
                if isinstance(tickets, list):
                    # Verify all tickets belong to the correct product
                    for ticket in tickets:
                        if ticket["product_id"] != product_id:
                            self.log_test("Get Tickets by Product", False, "Ticket from wrong product returned")
                            return False
                    
                    self.log_test("Get Tickets by Product", True, f"Retrieved {len(tickets)} tickets for product {product_id}")
                    return True
                else:
                    self.log_test("Get Tickets by Product", False, "Invalid response format")
                    return False
            else:
                self.log_test("Get Tickets by Product", False, f"Failed with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get Tickets by Product", False, f"Exception: {str(e)}")
            return False
    
    def test_ticket_redemption(self):
        """Test ticket redemption"""
        if not self.created_tickets:
            self.log_test("Ticket Redemption", False, "No tickets created to test")
            return False
            
        try:
            ticket = self.created_tickets[0]
            ticket_id = ticket["id"]
            
            redeem_data = {
                "ticket_id": ticket_id
            }
            
            response = requests.post(f"{self.base_url}/tickets/redeem", json=redeem_data, timeout=10)
            
            if response.status_code == 200:
                # Verify ticket is marked as redeemed
                ticket_response = requests.get(f"{self.base_url}/tickets/{ticket_id}", timeout=10)
                if ticket_response.status_code == 200:
                    updated_ticket = ticket_response.json()
                    if updated_ticket["is_redeemed"]:
                        self.log_test("Ticket Redemption", True, f"Ticket {ticket_id} successfully redeemed")
                        return True
                    else:
                        self.log_test("Ticket Redemption", False, "Ticket not marked as redeemed")
                        return False
                else:
                    self.log_test("Ticket Redemption", False, "Could not verify ticket redemption")
                    return False
            else:
                self.log_test("Ticket Redemption", False, f"Failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Ticket Redemption", False, f"Exception: {str(e)}")
            return False
    
    def test_double_redemption_prevention(self):
        """Test that tickets cannot be redeemed twice"""
        if not self.created_tickets:
            self.log_test("Double Redemption Prevention", False, "No tickets created to test")
            return False
            
        try:
            # Use the first ticket which should already be redeemed from previous test
            ticket_id = self.created_tickets[0]["id"]
            
            redeem_data = {
                "ticket_id": ticket_id
            }
            
            response = requests.post(f"{self.base_url}/tickets/redeem", json=redeem_data, timeout=10)
            
            if response.status_code == 400:
                self.log_test("Double Redemption Prevention", True, "Double redemption correctly prevented")
                return True
            else:
                self.log_test("Double Redemption Prevention", False, f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Double Redemption Prevention", False, f"Exception: {str(e)}")
            return False
    
    def test_nonexistent_ticket_redemption(self):
        """Test redemption of non-existent ticket"""
        try:
            fake_ticket_id = str(uuid.uuid4())
            redeem_data = {
                "ticket_id": fake_ticket_id
            }
            
            response = requests.post(f"{self.base_url}/tickets/redeem", json=redeem_data, timeout=10)
            
            if response.status_code == 404:
                self.log_test("Nonexistent Ticket Redemption", True, "Non-existent ticket correctly rejected")
                return True
            else:
                self.log_test("Nonexistent Ticket Redemption", False, f"Expected 404, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Nonexistent Ticket Redemption", False, f"Exception: {str(e)}")
            return False
    
    def test_get_specific_ticket(self):
        """Test retrieving a specific ticket"""
        if not self.created_tickets:
            self.log_test("Get Specific Ticket", False, "No tickets created to test")
            return False
            
        try:
            ticket_id = self.created_tickets[0]["id"]
            response = requests.get(f"{self.base_url}/tickets/{ticket_id}", timeout=10)
            
            if response.status_code == 200:
                ticket = response.json()
                if ticket["id"] == ticket_id:
                    self.log_test("Get Specific Ticket", True, f"Retrieved ticket {ticket_id}")
                    return True
                else:
                    self.log_test("Get Specific Ticket", False, "Wrong ticket returned")
                    return False
            else:
                self.log_test("Get Specific Ticket", False, f"Failed with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get Specific Ticket", False, f"Exception: {str(e)}")
            return False
    
    def test_nonexistent_product_operations(self):
        """Test operations on non-existent products"""
        fake_product_id = "NONEXISTENT-PRODUCT"
        
        try:
            # Test GET non-existent product
            response = requests.get(f"{self.base_url}/products/{fake_product_id}", timeout=10)
            if response.status_code != 404:
                self.log_test("Nonexistent Product Operations", False, f"GET: Expected 404, got {response.status_code}")
                return False
            
            # Test UPDATE non-existent product
            update_data = {"name": "Test"}
            response = requests.put(f"{self.base_url}/products/{fake_product_id}", json=update_data, timeout=10)
            if response.status_code != 404:
                self.log_test("Nonexistent Product Operations", False, f"PUT: Expected 404, got {response.status_code}")
                return False
            
            # Test DELETE non-existent product
            response = requests.delete(f"{self.base_url}/products/{fake_product_id}", timeout=10)
            if response.status_code != 404:
                self.log_test("Nonexistent Product Operations", False, f"DELETE: Expected 404, got {response.status_code}")
                return False
            
            # Test creating tickets for non-existent product
            ticket_data = {"product_id": fake_product_id, "quantity": 1}
            response = requests.post(f"{self.base_url}/tickets", json=ticket_data, timeout=10)
            if response.status_code != 404:
                self.log_test("Nonexistent Product Operations", False, f"CREATE TICKETS: Expected 404, got {response.status_code}")
                return False
            
            self.log_test("Nonexistent Product Operations", True, "All non-existent product operations correctly handled")
            return True
            
        except Exception as e:
            self.log_test("Nonexistent Product Operations", False, f"Exception: {str(e)}")
            return False
    
    def run_comprehensive_test_scenario(self):
        """Run the complete test scenario as requested"""
        print("\n" + "="*80)
        print("COMPREHENSIVE BACKEND TESTING - PRODUCT MANAGEMENT SYSTEM")
        print("="*80)
        
        # Test sequence
        tests = [
            ("Connection Test", self.test_connection),
            ("Product Creation with QR Code", self.test_product_creation),
            ("Duplicate Product ID Prevention", self.test_duplicate_product_id),
            ("Get All Products", self.test_get_all_products),
            ("Get Specific Product", self.test_get_specific_product),
            ("Product Update with QR Regeneration", self.test_product_update_with_qr_regeneration),
            ("Ticket Creation with Stock Reduction", self.test_ticket_creation_with_stock_reduction),
            ("Insufficient Stock Prevention", self.test_insufficient_stock),
            ("Get All Tickets", self.test_get_all_tickets),
            ("Get Tickets by Product", self.test_get_tickets_by_product),
            ("Ticket Redemption", self.test_ticket_redemption),
            ("Double Redemption Prevention", self.test_double_redemption_prevention),
            ("Nonexistent Ticket Redemption", self.test_nonexistent_ticket_redemption),
            ("Get Specific Ticket", self.test_get_specific_ticket),
            ("Nonexistent Product Operations", self.test_nonexistent_product_operations),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            print(f"\n--- Running: {test_name} ---")
            if test_func():
                passed += 1
            else:
                failed += 1
            time.sleep(0.5)  # Small delay between tests
        
        # Summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"Total Tests: {len(tests)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/len(tests)*100):.1f}%")
        
        if failed > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"❌ {result['test']}: {result['message']}")
        
        return failed == 0

def main():
    """Main test execution"""
    tester = BackendTester()
    success = tester.run_comprehensive_test_scenario()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Backend is working correctly.")
        exit(0)
    else:
        print("\n⚠️  SOME TESTS FAILED! Check the details above.")
        exit(1)

if __name__ == "__main__":
    main()