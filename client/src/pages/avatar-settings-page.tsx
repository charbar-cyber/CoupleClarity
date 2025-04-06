import React from 'react';
import { Link } from 'wouter';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
// Import the page header directly with a relative path 
import { PageHeader } from '../components/page-header';
import { AvatarGenerator } from '@/components/avatar-generator';
import { ChevronLeft } from 'lucide-react';

export default function AvatarSettingsPage() {
  return (
    <Container className="py-8">
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link to="/settings">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>
      
      <PageHeader 
        heading="Avatar Settings" 
        subheading="Customize your profile avatar using AI generation" 
      />
      
      <div className="mt-6">
        <AvatarGenerator />
      </div>
    </Container>
  );
}