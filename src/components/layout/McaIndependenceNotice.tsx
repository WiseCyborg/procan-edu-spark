import React from 'react';

export const MCA_APPROVED_LIST_URL =
  'https://cannabis.maryland.gov/pages/responsible_vendor_training.aspx';

type McaIndependenceNoticeProps = {
  className?: string;
  linkClassName?: string;
};

export const McaIndependenceNotice = ({
  className,
  linkClassName,
}: McaIndependenceNoticeProps) => (
  <span className={className}>
    ProCann Edu is an independent training provider and is not on the MCA approved Responsible Vendor Training list (
    <a
      href={MCA_APPROVED_LIST_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClassName}
    >
      see MCA's approved list
    </a>
    ); this course does not satisfy Maryland's annual responsible vendor / agent training duty. Last reviewed: October 2026
  </span>
);
