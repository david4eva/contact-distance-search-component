public with sharing class ContactsByStateController {
    @AuraEnabled(cacheable=true)
    public static List<Contact> getContactsByAccountState(String stateCode, Integer pageSize, Integer pageNumber) {
        Integer offSetSize = (pageNumber - 1) * pageSize;
        
        if (String.isBlank(stateCode)) {
            return new List<Contact>();
        }

        if (!Schema.sObjectType.Contact.isAccessible()) {
            throw new AuraHandledException('You do not have permission to access Contacts.');
        }

        return [
            SELECT Name, Account.Name, Email,Phone, Account.BillingStateCode, Account.BillingState
            FROM Contact
            WHERE Account.BillingStateCode =: stateCode
            ORDER BY FirstName, LastName
            LIMIT :pageSize
            OFFSET :offSetSize
        ];
    }
}