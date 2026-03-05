import { test } from '@playwright/test';
import { cleanupAllHubSpotAndSupabaseData } from '../utils/supabase-admin';

test.describe('@atomic-full-reset Vollständige Bereinigung HubSpot + Supabase', () => {
  test('@atomic-full-reset leert HubSpot und Supabase vollständig', async () => {
    await cleanupAllHubSpotAndSupabaseData();
  });
});
