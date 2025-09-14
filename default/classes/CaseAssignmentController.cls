/**
 * @description Dedicated controller for case assignment operations
 * Handles assigning contacts to cases and related functionality
 */
public with sharing class CaseAssignmentController {
    
    /**
     * @description Assigns a contact to a case by updating the Case.ContactId field
     * @param contactId The ID of the contact to assign
     * @param caseId The ID of the case to update
     * @return String Success message with details
     */
    @AuraEnabled
    public static String assignContactToCase(String contactId, String caseId) {
        // Validation
        validateInputParameters(contactId, caseId);
        
        // Permission checks
        validatePermissions();
        
        try {
            // Get contact and case details
            ContactCaseInfo info = getContactAndCaseInfo(contactId, caseId);
            
            // Perform the assignment
            updateCaseContact(info.caseRecord, contactId);
            
            // Return formatted success message
            return formatSuccessMessage(info);
            
        } catch (QueryException e) {
            System.debug('❌ Query error: ' + e.getMessage());
            throw new AuraHandledException('Contact or Case not found: ' + e.getMessage());
        } catch (DmlException e) {
            System.debug('❌ DML error: ' + e.getMessage());
            throw new AuraHandledException('Error updating case: ' + e.getDmlMessage(0));
        } catch (Exception e) {
            System.debug('❌ Unexpected error: ' + e.getMessage());
            throw new AuraHandledException('Unexpected error occurred: ' + e.getMessage());
        }
    }
    
    /**
     * @description Gets the current contact assigned to a case
     * @param caseId The ID of the case
     * @return CaseContactInfo Current assignment details
     */
    @AuraEnabled(cacheable=true)
    public static CaseContactInfo getCurrentCaseContact(String caseId) {
        if (String.isBlank(caseId)) {
            return null;
        }
        
        // Check read access before querying Case
        if (!Schema.sObjectType.Case.isAccessible()) {
            throw new AuraHandledException('You do not have permission to access Cases.');
        }
        try {
            Case currentCase = [
                SELECT Id, CaseNumber, ContactId, Contact.Name, Contact.Email, Contact.Phone,
                       Contact.Account.Name
                FROM Case 
                WHERE Id = :caseId 
                LIMIT 1
            ];
            
            return new CaseContactInfo(currentCase);
            
        } catch (Exception e) {
            System.debug('Error getting current case contact: ' + e.getMessage());
            return null;
        }
    }
    
    /**
     * @description Validates input parameters
     */
    private static void validateInputParameters(String contactId, String caseId) {
        if (String.isBlank(contactId)) {
            throw new AuraHandledException('Contact ID is required.');
        }
        if (String.isBlank(caseId)) {
            throw new AuraHandledException('Case ID is required.');
        }
    }
    
    /**
     * @description Validates user permissions
     */
    private static void validatePermissions() {
        if (!Schema.sObjectType.Case.isUpdateable()) {
            throw new AuraHandledException('You do not have permission to update Cases.');
        }
        if (!Schema.sObjectType.Contact.isAccessible()) {
            throw new AuraHandledException('You do not have permission to access Contacts.');
        }
    }
    
    /**
     * @description Gets contact and case information
     */
    private static ContactCaseInfo getContactAndCaseInfo(String contactId, String caseId) {
        // Get contact details
        Contact selectedContact = [
            SELECT Id, Name, Email, Phone, Account.Name, Account.BillingCity, Account.BillingState
            FROM Contact 
            WHERE Id = :contactId 
            LIMIT 1
        ];
        
        // Get case details
        Case caseRecord = [
            SELECT Id, CaseNumber, ContactId, Contact.Name, Subject, Status
            FROM Case 
            WHERE Id = :caseId 
            LIMIT 1
        ];    
        return new ContactCaseInfo(selectedContact, caseRecord);
    }
    
    /**
     * @description Updates the case with new contact
     */
    private static void updateCaseContact(Case caseRecord, String contactId) {
        caseRecord.ContactId = contactId;
        update caseRecord;
    }
    
    /**
     * @description Formats the success message
     */
    private static String formatSuccessMessage(ContactCaseInfo info) {
        String message = 'Case ' + info.caseRecord.CaseNumber + ' has been assigned to ' + info.contact.Name;
        
        return message;
    }
    
    // ============================================
    // WRAPPER CLASSES
    // ============================================
    
    /**
     * @description Wrapper class for contact and case information
     */
    private class ContactCaseInfo {
        public Contact contact;
        public Case caseRecord;
        
        public ContactCaseInfo(Contact contact, Case caseRecord) {
            this.contact = contact;
            this.caseRecord = caseRecord;
        }
    }
    
    /**
     * @description Wrapper class for current case contact information
     */
    public class CaseContactInfo {
        @AuraEnabled public String contactId;
        @AuraEnabled public String contactName;
        @AuraEnabled public String contactEmail;
        @AuraEnabled public String contactPhone;
        @AuraEnabled public String accountName;
        @AuraEnabled public String caseNumber;
        
        public CaseContactInfo(Case caseRecord) {
            this.contactId = caseRecord.ContactId;
            this.contactName = caseRecord.Contact?.Name;
            this.contactEmail = caseRecord.Contact?.Email;
            this.contactPhone = caseRecord.Contact?.Phone;
            this.accountName = caseRecord.Contact?.Account?.Name;
            this.caseNumber = caseRecord.CaseNumber;
        }
    }
}