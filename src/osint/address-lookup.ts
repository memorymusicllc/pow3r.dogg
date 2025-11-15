/**
 * Address Lookup
 * 
 * - Address validation and geocoding
 * - Cross-reference with OSINT Industries
 * - Property records (if available)
 * - Associated identities
 */

import type { Env } from '../types';

export interface AddressLookupResult {
  address: string;
  validated: boolean;
  geocoding: {
    latitude?: number;
    longitude?: number;
    formattedAddress?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  propertyRecords?: {
    owner?: string;
    propertyType?: string;
    assessedValue?: number;
    yearBuilt?: number;
  };
  associatedIdentities: Array<{
    name?: string;
    email?: string;
    phone?: string;
    relationship?: string;
  }>;
  timeline: Array<{
    date: string;
    event: string;
    source: string;
  }>;
  sources: string[];
}

export class AddressLookup {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async lookup(address: string): Promise<AddressLookupResult> {
    const result: AddressLookupResult = {
      address,
      validated: false,
      geocoding: {},
      associatedIdentities: [],
      timeline: [],
      sources: [],
    };

    // Google Maps Geocoding API (if available)
    try {
      const googleApiKey = this.env.GOOGLE_MAPS_API_KEY || 'credential:google_maps_api_key';
      const geocodeResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleApiKey}`
      );

      if (geocodeResponse.ok) {
        const data = await geocodeResponse.json() as {
          results?: Array<{
            geometry?: {
              location?: { lat: number; lng: number };
            };
            formatted_address?: string;
            address_components?: Array<{
              types: string[];
              long_name: string;
              short_name: string;
            }>;
          }>;
          status?: string;
        };

        if (data.results && data.results.length > 0) {
          const first = data.results[0];
          result.validated = true;
          
          if (first.geometry?.location) {
            result.geocoding.latitude = first.geometry.location.lat;
            result.geocoding.longitude = first.geometry.location.lng;
          }

          result.geocoding.formattedAddress = first.formatted_address;

          // Parse address components
          if (first.address_components) {
            for (const component of first.address_components) {
              if (component.types.includes('locality')) {
                result.geocoding.city = component.long_name;
              } else if (component.types.includes('administrative_area_level_1')) {
                result.geocoding.state = component.short_name;
              } else if (component.types.includes('country')) {
                result.geocoding.country = component.short_name;
              } else if (component.types.includes('postal_code')) {
                result.geocoding.postalCode = component.long_name;
              }
            }
          }

          result.sources.push('Google Maps Geocoding');
          result.timeline.push({
            date: new Date().toISOString().split('T')[0],
            event: 'Address validated and geocoded',
            source: 'Google Maps',
          });
        }
      }
    } catch (error) {
      console.error('Google Geocoding failed:', error);
    }

    // OSINT Industries cross-reference
    try {
      const osintKey = this.env.OSINT_INDUSTRIES_API_KEY || 'credential:osint_industries_api_key';
      const osintResponse = await fetch(
        `https://api.osintindustries.com/v1/address/${encodeURIComponent(address)}`,
        {
          headers: {
            'Authorization': `Bearer ${osintKey}`,
          },
        }
      );

      if (osintResponse.ok) {
        const data = await osintResponse.json() as {
          residents?: Array<{
            name?: string;
            email?: string;
            phone?: string;
            relationship?: string;
          }>;
          property?: {
            owner?: string;
            type?: string;
            value?: number;
            year_built?: number;
          };
        };

        if (data.residents) {
          result.associatedIdentities.push(...data.residents);
        }

        if (data.property) {
          result.propertyRecords = {
            owner: data.property.owner,
            propertyType: data.property.type,
            assessedValue: data.property.value,
            yearBuilt: data.property.year_built,
          };
        }

        result.sources.push('OSINT Industries');
        result.timeline.push({
          date: new Date().toISOString().split('T')[0],
          event: `Found ${data.residents?.length || 0} associated identity(ies)`,
          source: 'OSINT Industries',
        });
      }
    } catch (error) {
      console.error('OSINT Industries address lookup failed:', error);
    }

    // SmartyStreets (if available)
    try {
      const smartyKey = this.env.SMARTYSTREETS_API_KEY || 'credential:smarty_api_key';
      const smartyResponse = await fetch(
        `https://us-street.api.smartystreets.com/street-address?auth-id=${smartyKey}&street=${encodeURIComponent(address)}`
      );

      if (smartyResponse.ok) {
        const data = await smartyResponse.json() as Array<{
          components?: {
            city_name?: string;
            state_abbreviation?: string;
            zipcode?: string;
          };
        }>;

        if (data.length > 0 && data[0].components) {
          const comp = data[0].components;
          if (!result.geocoding.city && comp.city_name) {
            result.geocoding.city = comp.city_name;
          }
          if (!result.geocoding.state && comp.state_abbreviation) {
            result.geocoding.state = comp.state_abbreviation;
          }
          if (!result.geocoding.postalCode && comp.zipcode) {
            result.geocoding.postalCode = comp.zipcode;
          }

          result.sources.push('SmartyStreets');
        }
      }
    } catch (error) {
      console.error('SmartyStreets lookup failed:', error);
    }

    return result;
  }
}

