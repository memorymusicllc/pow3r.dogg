import * as Tabs from '@radix-ui/react-tabs';
import EmailLookup from './EmailLookup';
import ImageLookup from './ImageLookup';
import AddressLookup from './AddressLookup';
import BusinessLookup from './BusinessLookup';

export default function OSINTLookupPanel() {
  return (
    <div>
      <h2 className="font-header text-3xl mb-6">OSINT Lookup</h2>
      <Tabs.Root defaultValue="email" className="w-full">
        <Tabs.List className="flex gap-2 border-b border-true-black-border mb-6">
          <Tabs.Trigger
            value="email"
            className="px-4 py-2 font-header text-sm data-[state=active]:border-b-2 data-[state=active]:border-true-black-accent data-[state=active]:text-true-black-text"
          >
            Email
          </Tabs.Trigger>
          <Tabs.Trigger
            value="image"
            className="px-4 py-2 font-header text-sm data-[state=active]:border-b-2 data-[state=active]:border-true-black-accent data-[state=active]:text-true-black-text"
          >
            Image
          </Tabs.Trigger>
          <Tabs.Trigger
            value="address"
            className="px-4 py-2 font-header text-sm data-[state=active]:border-b-2 data-[state=active]:border-true-black-accent data-[state=active]:text-true-black-text"
          >
            Address
          </Tabs.Trigger>
          <Tabs.Trigger
            value="business"
            className="px-4 py-2 font-header text-sm data-[state=active]:border-b-2 data-[state=active]:border-true-black-accent data-[state=active]:text-true-black-text"
          >
            Business
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="email">
          <EmailLookup />
        </Tabs.Content>

        <Tabs.Content value="image">
          <ImageLookup />
        </Tabs.Content>

        <Tabs.Content value="address">
          <AddressLookup />
        </Tabs.Content>

        <Tabs.Content value="business">
          <BusinessLookup />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

