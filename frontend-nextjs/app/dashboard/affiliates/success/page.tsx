/** Página: Afiliaciones Exitosas */
'use client';

import { DashboardContent } from '@/components/dashboard/dashboard-content';
import { useEffect } from 'react';

export default function AffiliatesSuccessPage() {
    useEffect(() => {
        console.log("Mounting AffiliatesSuccessPage");
    }, []);

    return <DashboardContent activeSection="base-afiliados-exitosas" />;
}
