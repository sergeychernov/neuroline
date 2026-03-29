import React from 'react';
import clsx from 'clsx';
import {translate} from '@docusaurus/Translate';
import {useAnchorTargetClassName} from '@docusaurus/theme-common';
import Link from '@docusaurus/Link';
import useBrokenLinks from '@docusaurus/useBrokenLinks';

/**
 * Swizzled Heading component.
 *
 * Оригинал принудительно убирает id у h1 заголовков.
 * README-файлы используют h1 как anchor-target для переключателя языков
 * ([English](#pkg) | [Русский](#pkg-1)), что совместимо с GitHub/npm.
 * Эта версия сохраняет id для h1, чтобы ссылки работали и в Docusaurus.
 */
export default function Heading({as: As, id, ...props}) {
  const brokenLinks = useBrokenLinks();
  const anchorTargetClassName = useAnchorTargetClassName(id);

  if (!id) {
    return <As {...props} id={undefined} />;
  }

  brokenLinks.collectAnchor(id);

  if (As === 'h1') {
    return <As {...props} id={id} />;
  }

  const anchorTitle = translate(
    {
      id: 'theme.common.headingLinkTitle',
      message: 'Direct link to {heading}',
      description: 'Title for link to heading',
    },
    {
      heading: typeof props.children === 'string' ? props.children : id,
    },
  );

  return (
    <As
      {...props}
      className={clsx('anchor', anchorTargetClassName, props.className)}
      id={id}>
      {props.children}
      <Link
        className="hash-link"
        to={`#${id}`}
        aria-label={anchorTitle}
        title={anchorTitle}
        translate="no">
        &#8203;
      </Link>
    </As>
  );
}
