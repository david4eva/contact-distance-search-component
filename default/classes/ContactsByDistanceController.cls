public with sharing class ContactsByDistanceController {
    
    @AuraEnabled(cacheable=true)
    public static List<ContactWithDistance> getContactsByAccountDistance(String caseId, Decimal radius, Integer pageSize, Integer pageNumber) {
        Integer offSetSize = (pageNumber - 1) * pageSize;
        
        // Validation
        if (String.isBlank(caseId) || radius == null || radius <= 0) {
            System.debug('Validation failed - returning empty list');
            return new List<ContactWithDistance>();
        }
        
        // Permission check
        if (!Schema.sObjectType.Contact.isAccessible() ||
            !Schema.sObjectType.Account.isAccessible() ||
            !Schema.sObjectType.Case.isAccessible()) {
            throw new AuraHandledException('Insufficient permissions to access required objects.');
        }
        
        // 1) Get the Case with its geocoordinates
        List<Case> cases = [
            SELECT Id, Case_Location__Latitude__s, Case_Location__Longitude__s
            FROM Case
            WHERE Id = :caseId
            AND Case_Location__Latitude__s != NULL
            AND Case_Location__Longitude__s != NULL
            LIMIT 1
        ];
        
        if (cases.isEmpty()) {
            throw new AuraHandledException('Case not found or does not have valid geocoordinates.');
        }
        
        Case targetCase = cases[0];
        Decimal caseLat = targetCase.Case_Location__Latitude__s;
        Decimal caseLon = targetCase.Case_Location__Longitude__s;
        
        // 2) Get all contacts with coordinates
        List<Contact> allContacts = [
            SELECT Id, Name, Title, Email, Phone, 
                   MailingCity, MailingState, MailingStateCode,
                   Account.Id, Account.Name, 
                   Account.BillingStreet, Account.BillingCity, 
                   Account.BillingState, Account.BillingStateCode,
                   Account.BillingLatitude, Account.BillingLongitude
            FROM Contact
            WHERE Account.BillingLatitude != NULL
              AND Account.BillingLongitude != NULL
            LIMIT 1000
        ];
        
        // 3) Calculate distances and filter in Apex
        List<ContactWithDistance> contactsWithDistance = new List<ContactWithDistance>();
        
        for (Contact c : allContacts) {
            Double distance = calculateDistance(caseLat, caseLon,
                c.Account.BillingLatitude,
                c.Account.BillingLongitude);
            
            if (distance <= radius) {
                contactsWithDistance.add(new ContactWithDistance(c, distance));
            }
        }
        
        // 4) Sort by distance
        contactsWithDistance.sort();
        
        // 5) Apply pagination
        Integer startIndex = offSetSize;
        Integer endIndex = Math.min(startIndex + pageSize, contactsWithDistance.size());
        
        List<ContactWithDistance> paginatedResults = new List<ContactWithDistance>();
        for (Integer i = startIndex; i < endIndex; i++) {
            paginatedResults.add(contactsWithDistance[i]);
        }
        return paginatedResults;
    }
    
    // Helper method to calculate distance using Haversine formula
    private static Double calculateDistance(Decimal lat1, Decimal lon1, Decimal lat2, Decimal lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            return 999999.0;
        }
        
        Double R = 3959.0; // Earth's radius in miles
        
        Double dLat = toRadians(lat2 - lat1);
        Double dLon = toRadians(lon2 - lon1);
        
        Double lat1Rad = toRadians(lat1);
        Double lat2Rad = toRadians(lat2);
        
        Double a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        
        Double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        Double distance = R * c;
        
        return Math.round(distance * 10) / 10.0;
    }
    
    private static Double toRadians(Decimal degrees) {
        return degrees * Math.PI / 180;
    }
    
    // Wrapper class to include distance
    public class ContactWithDistance implements Comparable {
        @AuraEnabled public String Id;
        @AuraEnabled public String Name;
        @AuraEnabled public String Title;
        @AuraEnabled public String Email;
        @AuraEnabled public String Phone;
        @AuraEnabled public String AccountName;
        @AuraEnabled public String AccountStateCode;
        @AuraEnabled public Double DistanceFromCase;
        
        public ContactWithDistance(Contact c, Double distance) {
            this.Id = c.Id;
            this.Name = c.Name;
            this.Title = c.Title;
            this.Email = c.Email;
            this.Phone = c.Phone;
            this.AccountName = c.Account?.Name;
            this.AccountStateCode = c.Account?.BillingStateCode;
            this.DistanceFromCase = distance;
        }
        
        public Integer compareTo(Object obj) {
            ContactWithDistance other = (ContactWithDistance) obj;
            if (this.DistanceFromCase < other.DistanceFromCase) return -1;
            if (this.DistanceFromCase > other.DistanceFromCase) return 1;
            return 0;
        }
    }
}