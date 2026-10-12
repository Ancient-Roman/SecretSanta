import { NextRequest, NextResponse } from 'next/server';
import { requireMember, requireStatus, UnauthorizedError } from '@/lib/auth/guards';
import { db, wishlistItems } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { addWishlistItemSchema, updateWishlistItemSchema, reorderWishlistSchema } from '@/lib/validation/schemas';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, membership } = await requireMember(familyId);

    const items = await db.query.wishlistItems.findMany({
      where: eq(wishlistItems.membershipId, membership.id),
      orderBy: (items) => items.position,
    });

    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Get wishlist error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, membership } = await requireMember(familyId);
    await requireStatus(familyId, 'open', 'locked');

    const body = await request.json();
    const validation = addWishlistItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { title, url, notes } = validation.data;

    // Get position (insert at end)
    const items = await db.query.wishlistItems.findMany({
      where: eq(wishlistItems.membershipId, membership.id),
    });

    const position = items.length;

    const result = await db
      .insert(wishlistItems)
      .values({
        membershipId: membership.id,
        title,
        url: url || null,
        notes: notes || null,
        position,
      })
      .returning();

    return NextResponse.json({ item: result[0] });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Add wishlist item error:', error);
    return NextResponse.json(
      { error: 'Failed to add item' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, membership } = await requireMember(familyId);
    await requireStatus(familyId, 'open', 'locked');

    const body = await request.json();
    const validation = updateWishlistItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { id, title, url, notes } = validation.data;

    // Verify ownership
    const item = await db.query.wishlistItems.findFirst({
      where: eq(wishlistItems.id, id),
      with: { membership: true },
    });

    if (!item || item.membershipId !== membership.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const result = await db
      .update(wishlistItems)
      .set({
        title,
        url: url || null,
        notes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(wishlistItems.id, id))
      .returning();

    return NextResponse.json({ item: result[0] });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Update wishlist item error:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, membership } = await requireMember(familyId);
    await requireStatus(familyId, 'open', 'locked');

    const { itemId } = await request.json();

    // Verify ownership
    const item = await db.query.wishlistItems.findFirst({
      where: eq(wishlistItems.id, itemId),
    });

    if (!item || item.membershipId !== membership.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await db.delete(wishlistItems).where(eq(wishlistItems.id, itemId));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Delete wishlist item error:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
