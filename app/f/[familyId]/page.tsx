'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CreateExclusionModal } from '@/app/_components/exclusions/createExclusionModal';
import { DeleteExclusionModal } from '@/app/_components/exclusions/deleteExclusionModal';
import { FamilyMemberData } from '@/app/_components/types/family';
import { Exclusion, MemberExclusions } from '@/app/_components/types/exclusion';

export default function FamilyPage() {
  const params = useParams();
  const familyId = params.familyId;

  const [family, setFamily] = useState<FamilyMemberData | null>(null);
  const [myExclusions, setMyExclusions] = useState<MemberExclusions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showExclusionModal, setShowExclusionModal] = useState(false);
  const [exclusionToDelete, setExclusionToDelete] = useState<Exclusion | null>(null);

  useEffect(() => {
    fetchFamily();
  }, [familyId]);

  async function fetchFamily() {
    try {
      const response = await fetch(`/api/families/${familyId}`);
      if (!response.ok) throw new Error('Failed to fetch family');
      const data: FamilyMemberData = await response.json();
      setFamily(data);

      const exclusionsResponse = await fetch(`/api/families/${familyId}/exclusions`);
      if (!exclusionsResponse.ok) throw new Error('Failed to fetch exclusions');
      const exclusionData: MemberExclusions = await exclusionsResponse.json();
      setMyExclusions(exclusionData);
    } catch (err) {
      setError('Failed to load family. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center text-gray-600">Loading family...</div>;
  }

  if (error || !family) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-600 font-bold">{error || 'Family not found'}</p>
        <a href="/families" className="text-santa-red hover:underline">
          ← Back to my families
        </a>
      </div>
    );
  }

  const yourId = family.members.find((m) => m.isYou)?.id;
  if (!yourId) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-600 font-bold">You are not a member of this family.</p>
        <a href="/families" className="text-santa-red hover:underline">
          ← Back to my families
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">{family.name}</h2>
          <p className="text-gray-600 mt-1">
            Code: <span className="font-mono font-bold">{family.code}</span> • 
            {' '}{family.status === 'open' ? '🟢 Open' : family.status === 'locked' ? '🔒 Locked' : family.status === 'day_of' ? '🎉 Day Of' : '✓ Completed'}
          </p>
        </div>
        {family.isHost && (
          <a
            href={`/f/${familyId}/host`}
            className="bg-santa-red text-white px-4 py-2 rounded font-medium hover:bg-red-700 transition"
          >
            Host Controls
          </a>
        )}
      </div>

      {family.myAssignment && family.status !== 'open' && (
        <div className="bg-santa-red text-white rounded-lg p-6">
          <h3 className="text-lg font-bold mb-2">🎁 Your Match</h3>
          <p className="text-lg">{family.myAssignment.receiver}</p>
          {family.myAssignment.budget && (
            <p className="text-sm mt-2">Budget: ${family.myAssignment.budget}</p>
          )}
          {family.myAssignment.exchangeDate && (
            <p className="text-sm">Exchange: {new Date(family.myAssignment.exchangeDate).toLocaleDateString()}</p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Members & Wishlists</h3>
        <div className="grid gap-4">
          {family.members.map((member) => (
            <div key={member.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-lg">
                  {member.displayName}
                  {member.isYou && ' (You)'}
                </h4>
              </div>

              {member.wishlistItems.length === 0 ? (
                <p className="text-gray-600 text-sm italic">No wishlist items yet</p>
              ) : (
                <ul className="space-y-2">
                  {member.wishlistItems.map((item) => (
                    <li key={item.id} className="text-sm bg-gray-50 p-2 rounded">
                      <div className="font-medium">{item.title}</div>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-santa-red hover:underline text-xs"
                        >
                          View
                        </a>
                      )}
                      {item.notes && <p className="text-gray-600 text-xs mt-1">{item.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}

              {member.isYou && family.status === 'open' && (
                <a
                  href={`/f/${familyId}/wishlist`}
                  className="mt-3 text-santa-red hover:underline text-sm font-medium"
                >
                  Edit your wishlist →
                </a>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-4">
        <h3 className="text-xl font-bold">Your Exclusions ({myExclusions?.exclusions?.length || 0})</h3>
        {myExclusions?.exclusions.length === 0 ? (
          <p className="text-gray-600">No exclusions</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {myExclusions?.exclusions.map((ex) => (
              <div
                key={ex.id}
                className="inline-flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-2 py-2 text-sm"
              >
                <span>
                  You ↔ {ex.displayName} {ex.createdByMe ? '' : '(Host added)'}
                </span>
                {family.status === 'open' && (
                  <button
                    onClick={() => setExclusionToDelete({ memberAId: ex.membershipId, memberBId: yourId, memberA: ex.displayName, memberB: 'You' })}
                    aria-label={`Remove exclusion between You and ${ex.displayName}`}
                    className="text-gray-400 hover:text-santa-red px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {family.status === 'open' && (
          <button
            onClick={() => setShowExclusionModal(true)}
            className="text-white bg-santa-red px-4 py-2 rounded font-medium hover:bg-red-500"
          >
            {'Add Exclusions'}
          </button>
        )}
      </div>
      </div>

      <div className="border-t pt-4">
        <a href="/families" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
          ← Back to my families
        </a>
      </div>

      {/* Modals */}
      <CreateExclusionModal
        open={showExclusionModal}
        onClose={() => setShowExclusionModal(false)}
        familyId={familyId as string}
        members={family.members}
        exclusions={myExclusions?.exclusions?.map((e) => ({ memberAId: e.membershipId, memberBId: yourId })) || []}
        onCreated={fetchFamily}
        isHost={family.isHost}
        currentMembershipId={family.isHost ? undefined : yourId}
      />
      <DeleteExclusionModal
        exclusion={exclusionToDelete}
        onClose={() => setExclusionToDelete(null)}
        familyId={familyId as string}
        onDeleted={fetchFamily}
      />
    </div>
  );
}
