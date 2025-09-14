public with sharing class ContactsPaginationController {
    
    @AuraEnabled(cacheable=true)
    public static Integer getContactCount(String searchBySelection, String name, String stateCode, String distance, Id caseId) {
           
        if (String.isBlank(searchBySelection)) {
            return 0;
        }
        
        if (!Schema.sObjectType.Contact.isAccessible()) {
            throw new AuraHandledException('You do not have permission to access Contacts.');
        }
        
        Integer countResult = 0;
        
        switch on searchBySelection {
            when 'name' {
                countResult = getContactCountByName(name);
            }
            when 'state' {
                countResult = getContactCountByState(stateCode);
            }
            when 'distance' {
                countResult = getContactCountByDistance(distance, caseId);
            }
            when else {
                System.debug('Unknown search type: ' + searchBySelection);
            }
        }
        return countResult;
    }
    
    private static Integer getContactCountByName(String name) {
        if (String.isNotBlank(name)) {
            Integer result = [
                SELECT COUNT()
                FROM Contact
                WHERE Name LIKE :('%' + name + '%')
            ];
            return result;
        }
        return 0;
    }
    
    private static Integer getContactCountByState(String stateCode) {
        if (String.isNotBlank(stateCode)) {
            Integer result = [
                SELECT COUNT()
                FROM Contact
                WHERE Account.BillingStateCode = :stateCode
            ];
            return result;
        }
        return 0;
    }
    
    private static Integer getContactCountByDistance(String distance, Id caseId) {
        if (String.isNotBlank(distance) && caseId != null) {
            try {
                if (!Schema.sObjectType.Case.isAccessible()) {
                    throw new AuraHandledException('You do not have permission to access Cases.');
                }
                
                // Get case location coordinates - adjust field names as needed
                Case caseRecord = [
                    SELECT Case_Location__Latitude__s, Case_Location__Longitude__s
                    FROM Case 
                    WHERE Id = :caseId 
                    LIMIT 1
                ];
                
                if (caseRecord.Case_Location__Latitude__s != null && caseRecord.Case_Location__Longitude__s != null) {
                    Decimal maxDistance = Decimal.valueOf(distance);
                    
                    // Get all contacts with account billing coordinates and calculate distance manually
                    List<Contact> contacts = [
                        SELECT Id, Account.BillingLatitude, Account.BillingLongitude
                        FROM Contact
                        WHERE Account.BillingLatitude != null 
                        AND Account.BillingLongitude != null
                    ];
                    
                    Integer count = 0;
                    for (Contact c : contacts) {
                        Double calculatedDistance = calculateDistance(
                            caseRecord.Case_Location__Latitude__s,
                        caseRecord.Case_Location__Longitude__s,
                        c.Account.BillingLatitude,
                        c.Account.BillingLongitude
                            );
                        
                        if (calculatedDistance <= maxDistance) {
                            count++;
                        }
                    }
                    return count;
                } else {
                    System.debug('Case location coordinates are null');
                }
            } catch (Exception e) {
                throw new AuraHandledException('Error calculating distance-based contact count: ' + e.getMessage());
            }
        }
        return 0;
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
}