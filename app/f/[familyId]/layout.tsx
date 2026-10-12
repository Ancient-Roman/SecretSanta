import { requireMember, requireStatus } from '@/lib/auth/guards';
import { db, families, memberships, wishlistItems, assignments, exclusions } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { ReactNode } from 'react';

export default async function FamilyLayout(props: {
  children: ReactNode;
  params: Promise<{ familyId: string }>;
}) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, membership } = await requireMember(familyId);

    // Fetch full family data
    const family = await db.query.families.findFirst({
      where: eq(families.id, familyId),
      with: {
        memberships: {
          with: {
            user: true,
            wishlistItems: true,
          },
        },
        host: true,
        assignments: true,
        exclusions: true,
      },
    });

    if (!family) {
      return <div className="text-center text-red-600">Family not found</div>;
    }

    // Pass to children via context-like pattern
    return <>{props.children}</>;
  } catch (error) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-600 font-bold">Access Denied</p>
        <p className="text-gray-600">You don't have access to this family</p>
        <a href="/families" className="text-santa-red hover:underline">
          ← Back to my families
        </a>
      </div>
    );
  }
}
