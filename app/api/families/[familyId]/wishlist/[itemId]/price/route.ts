import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db, assignments, wishlistItems } from '@/lib/db';
import { requireMember, UnauthorizedError } from '@/lib/auth/guards';
import { fetchPrice } from '@/lib/fetchPrice';

export const maxDuration = 15;

const PRICE_TTL_SECONDS = 60 * 60;  // 1 hr

const getCachedPrice = unstable_cache(
  async (url: string) => {
    const result = await fetchPrice(url);
    return result ? { ...result, checkedAt: Date.now() } : null;
  },
  ['wishlist-item-price'],
  { revalidate: PRICE_TTL_SECONDS }
);

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ familyId: string; itemId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);
  const itemId = parseInt(params.itemId);

  if (!Number.isInteger(familyId) || !Number.isInteger(itemId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const { membership } = await requireMember(familyId);

    const assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.familyId, familyId),
        eq(assignments.giverMembershipId, membership.id)
      ),
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const item = await db.query.wishlistItems.findFirst({
      where: eq(wishlistItems.id, itemId),
      with: { membership: true },
    });

    if (
      !item?.url ||
      item.membership.familyId !== familyId ||
      item.membershipId !== assignment.receiverMembershipId
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const price = await getCachedPrice(item.url);
    if (!price) {
      return NextResponse.json({ error: 'Price unavailable' }, { status: 404 });
    }

    return NextResponse.json(price);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const status = error.message === 'Not authenticated' ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error('Price lookup error:', error);
    return NextResponse.json({ error: 'Failed to look up price' }, { status: 500 });
  }
}
