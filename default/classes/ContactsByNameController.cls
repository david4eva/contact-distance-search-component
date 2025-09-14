public with sharing class ContactsByNameController {
    @AuraEnabled(cacheable=true)
    public static List<Contact> getContactsByName(String name, Integer pageSize, Integer pageNumber) {
        Integer offSetSize = (pageNumber - 1) * pageSize;

        if (String.isBlank(name)) {
            return new List<Contact>();
        }

        if (!Schema.sObjectType.Contact.isAccessible()) {
            throw new AuraHandledException('You do not have permission to access Contacts.');
        }

        return [
            SELECT Name, Account.Name, Email,Phone, Account.BillingStateCode, Account.BillingState
            FROM Contact
            WHERE Name LIKE :('%' + name + '%')
            ORDER BY Name ASC
            LIMIT :pageSize
            OFFSET :offSetSize
        ];
    }
}