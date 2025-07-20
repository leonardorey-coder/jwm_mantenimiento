-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost
-- Tiempo de generación: 04-05-2025 a las 03:49:21
-- Versión del servidor: 10.4.21-MariaDB
-- Versión de PHP: 8.1.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `finest_mant_cuartos`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cuartos`
--

CREATE TABLE `cuartos` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `edificio_id` int(11) NOT NULL,
  `descripcion` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `cuartos`
--

INSERT INTO `cuartos` (`id`, `nombre`, `edificio_id`, `descripcion`) VALUES
(1, 'A101', 1, NULL),
(2, 'A102', 1, NULL),
(3, 'A103', 1, '17/7/2024'),
(4, 'A104', 1, NULL),
(5, 'A105', 1, NULL),
(6, 'A106', 1, NULL),
(7, 'S-A201', 1, NULL),
(8, 'A202', 1, NULL),
(9, 'A203', 1, NULL),
(10, 'A204', 1, NULL),
(11, 'A205', 1, NULL),
(12, 'A206', 1, NULL),
(13, 'A207', 1, NULL),
(14, 'S-A208', 1, NULL),
(15, 'A302', 1, NULL),
(16, 'A303', 1, NULL),
(17, 'A304', 1, NULL),
(18, 'A305', 1, NULL),
(19, 'A306', 1, NULL),
(20, 'S-A301', 1, NULL),
(21, 'S-A307', 1, NULL),
(22, 'A401', 1, NULL),
(23, 'A402', 1, NULL),
(24, 'A403', 1, NULL),
(25, 'A404', 1, NULL),
(26, 'A405', 1, NULL),
(27, 'A406', 1, NULL),
(28, 'S-A401', 1, NULL),
(29, 'S-A407', 1, NULL),
(30, 'A501', 1, NULL),
(31, 'A502', 1, NULL),
(32, 'A503', 1, NULL),
(33, 'A504', 1, NULL),
(34, 'A505', 1, NULL),
(35, 'A506', 1, NULL),
(36, 'S-A501', 1, NULL),
(37, 'S-A507', 1, NULL),
(38, 'B101', 2, NULL),
(39, 'B102', 2, NULL),
(40, 'B103', 2, NULL),
(41, 'B104', 2, NULL),
(42, 'B105', 2, '10/9/2024'),
(43, 'B106', 2, NULL),
(44, 'B107', 2, NULL),
(45, 'B108', 2, NULL),
(46, 'B109', 2, NULL),
(47, 'B110', 2, NULL),
(48, 'B111', 2, NULL),
(49, 'B112', 2, NULL),
(50, 'B113', 2, NULL),
(51, 'B114', 2, NULL),
(52, 'B115', 2, NULL),
(53, 'B201', 2, NULL),
(54, 'B202', 2, NULL),
(55, 'B203', 2, '27/10/2024'),
(56, 'B204', 2, NULL),
(57, 'B205', 2, NULL),
(58, 'B206', 2, NULL),
(59, 'B207', 2, NULL),
(60, 'B208', 2, NULL),
(61, 'B210', 2, NULL),
(62, 'B211', 2, NULL),
(63, 'B212', 2, NULL),
(64, 'B213', 2, NULL),
(65, 'B214', 2, NULL),
(66, 'B215', 2, NULL),
(67, 'B301', 2, NULL),
(68, 'B302', 2, NULL),
(69, 'B303', 2, NULL),
(70, 'B304', 2, NULL),
(71, 'B305', 2, NULL),
(72, 'B306', 2, NULL),
(73, 'B308', 2, NULL),
(74, 'B309', 2, NULL),
(75, 'B310', 2, NULL),
(76, 'B311', 2, NULL),
(77, 'B312', 2, NULL),
(78, 'B313', 2, NULL),
(79, 'B315', 2, NULL),
(80, 'B401', 2, NULL),
(81, 'B402', 2, NULL),
(82, 'B403', 2, NULL),
(83, 'B404', 2, NULL),
(84, 'B405', 2, NULL),
(85, 'B406', 2, NULL),
(86, 'B407', 2, NULL),
(87, 'B408', 2, NULL),
(88, 'B409', 2, NULL),
(89, 'B410', 2, NULL),
(90, 'B411', 2, NULL),
(91, 'B412', 2, NULL),
(92, 'B413', 2, NULL),
(93, 'B414', 2, NULL),
(94, 'B415', 2, NULL),
(95, 'C101', 3, NULL),
(96, 'C102', 3, NULL),
(97, 'C103', 3, NULL),
(98, 'C104', 3, NULL),
(99, 'C105', 3, NULL),
(100, 'C106', 3, NULL),
(101, 'C107', 3, NULL),
(102, 'C108', 3, NULL),
(103, 'C109', 3, NULL),
(104, 'C110', 3, NULL),
(105, 'C111', 3, NULL),
(106, 'C112', 3, '11/12/2024'),
(107, 'C113', 3, NULL),
(108, 'C201', 3, NULL),
(109, 'C202', 3, NULL),
(110, 'C203', 3, NULL),
(111, 'C204', 3, NULL),
(112, 'C205', 3, NULL),
(113, 'C206', 3, NULL),
(114, 'C207', 3, NULL),
(115, 'C208', 3, NULL),
(116, 'C209', 3, NULL),
(117, 'C210', 3, NULL),
(118, 'C211', 3, NULL),
(119, 'C212', 3, NULL),
(120, 'C213', 3, NULL),
(121, 'C214', 3, NULL),
(122, 'C301', 3, NULL),
(123, 'C302', 3, NULL),
(124, 'C303', 3, NULL),
(125, 'C304', 3, NULL),
(126, 'C305', 3, NULL),
(127, 'C306', 3, NULL),
(128, 'C307', 3, NULL),
(129, 'C308', 3, NULL),
(130, 'C309', 3, NULL),
(131, 'C310', 3, NULL),
(132, 'C311', 3, NULL),
(133, 'C312', 3, NULL),
(134, 'C313', 3, NULL),
(135, 'C314', 3, NULL),
(136, 'C401', 3, NULL),
(137, 'C402', 3, NULL),
(138, 'C403', 3, NULL),
(139, 'C404', 3, NULL),
(140, 'C405', 3, NULL),
(141, 'C406', 3, NULL),
(142, 'C407', 3, NULL),
(143, 'C408', 3, NULL),
(144, 'C409', 3, NULL),
(145, 'C410', 3, NULL),
(146, 'C411', 3, NULL),
(147, 'C412', 3, NULL),
(148, 'C413', 3, NULL),
(149, 'C414', 3, NULL),
(150, 'E101', 4, NULL),
(151, 'E102', 4, NULL),
(152, 'E103', 4, NULL),
(153, 'E104', 4, NULL),
(154, 'E105', 4, NULL),
(155, 'E106', 4, NULL),
(156, 'E107', 4, '25/07/2024'),
(157, 'E108', 4, NULL),
(158, 'E109', 4, NULL),
(159, 'E110', 4, '22/07/2024'),
(160, 'E111', 4, NULL),
(161, 'E112', 4, NULL),
(162, 'E113', 4, NULL),
(163, 'E201', 4, NULL),
(164, 'E202', 4, NULL),
(165, 'E203', 4, NULL),
(166, 'E204', 4, NULL),
(167, 'E205', 4, NULL),
(168, 'E206', 4, NULL),
(169, 'E207', 4, NULL),
(170, 'E208', 4, NULL),
(171, 'E209', 4, NULL),
(172, 'E210', 4, NULL),
(173, 'E211', 4, NULL),
(174, 'E212', 4, NULL),
(175, 'E301', 4, NULL),
(176, 'E302', 4, NULL),
(177, 'E303', 4, NULL),
(178, 'E304', 4, NULL),
(179, 'E305', 4, NULL),
(180, 'E306', 4, NULL),
(181, 'E307', 4, NULL),
(182, 'E308', 4, NULL),
(183, 'E309', 4, NULL),
(184, 'E310', 4, NULL),
(185, 'E311', 4, NULL),
(186, 'E312', 4, NULL),
(187, 'E401', 4, NULL),
(188, 'E402', 4, NULL),
(189, 'E403', 4, NULL),
(190, 'E404', 4, NULL),
(191, 'E405', 4, NULL),
(192, 'E406', 4, NULL),
(193, 'E407', 4, NULL),
(194, 'E408', 4, NULL),
(195, 'E409', 4, NULL),
(196, 'E410', 4, NULL),
(197, 'E411', 4, NULL),
(198, 'E412', 4, NULL),
(199, 'F101', 5, NULL),
(200, 'F102', 5, NULL),
(201, 'F103', 5, NULL),
(202, 'F104', 5, NULL),
(203, 'F105', 5, '16/12/2024'),
(204, 'F106', 5, '19/12/2024'),
(205, 'F107', 5, '05/10/2024'),
(206, 'F108', 5, NULL),
(207, 'F109', 5, NULL),
(208, 'F110', 5, NULL),
(209, 'F111', 5, NULL),
(210, 'F112', 5, NULL),
(211, 'F113', 5, '29/10/2024'),
(212, 'S-F114', 5, NULL),
(213, 'F201', 5, NULL),
(214, 'F202', 5, NULL),
(215, 'F203', 5, NULL),
(216, 'F204', 5, NULL),
(217, 'F205', 5, NULL),
(218, 'F206', 5, NULL),
(219, 'F207', 5, NULL),
(220, 'F208', 5, NULL),
(221, 'F209', 5, NULL),
(222, 'F210', 5, NULL),
(223, 'F211', 5, '23/11/2024'),
(224, 'F212', 5, NULL),
(225, 'F213', 5, NULL),
(226, 'S-F214', 5, NULL),
(227, 'F301', 5, NULL),
(228, 'F302', 5, NULL),
(229, 'F303', 5, NULL),
(230, 'F304', 5, NULL),
(231, 'F305', 5, NULL),
(232, 'F306', 5, NULL),
(233, 'F307', 5, NULL),
(234, 'F308', 5, NULL),
(235, 'F309', 5, NULL),
(236, 'F310', 5, NULL),
(237, 'F311', 5, NULL),
(238, 'F312', 5, NULL),
(239, 'F313', 5, NULL),
(240, 'S-F314', 5, NULL),
(241, 'F401', 5, NULL),
(242, 'F402', 5, NULL),
(243, 'F403', 5, NULL),
(244, 'F404', 5, NULL),
(245, 'F405', 5, NULL),
(246, 'F406', 5, NULL),
(247, 'F407', 5, NULL),
(248, 'F408', 5, NULL),
(249, 'F409', 5, NULL),
(250, 'F410', 5, NULL),
(251, 'F411', 5, NULL),
(252, 'F412', 5, NULL),
(253, 'F413', 5, NULL),
(254, 'S-F414', 5, NULL),
(255, 'G101', 6, '12/06/2024'),
(256, 'G102', 6, '20/07/2024'),
(257, 'G103', 6, '13/06/2024'),
(258, 'G104', 6, '04/09/2024'),
(259, 'G105', 6, '05/07/2024'),
(260, 'G106', 6, '02/07/2024'),
(261, 'G107', 6, '05/09/2024'),
(262, 'G108', 6, '10/07/2024'),
(263, 'G109', 6, '13/06/2024'),
(264, 'G110', 6, '17/06/2024'),
(265, 'S-G111', 6, '27/08/2024'),
(266, 'G201', 6, '18/08/2024'),
(267, 'G202', 6, '10/10/2024'),
(268, 'G203', 6, '16/08/2024'),
(269, 'G204', 6, '15/08/2024'),
(270, 'S-G408', 6, '01/11/2024'),
(271, 'G206', 6, '12/09/2024'),
(272, 'G207', 6, '08/11/2024'),
(273, 'G208', 6, '28/11/2024'),
(274, 'G209', 6, '16/01/2025'),
(275, 'G210', 6, '23/01/2025'),
(276, 'G211', 6, '03/12/2024'),
(277, 'G212', 6, NULL),
(278, 'S-G213', 6, '02/08/2024'),
(279, 'G301', 6, '03/02/2025'),
(280, 'G302', 6, '22/02/2025'),
(281, 'G303', 6, NULL),
(282, 'G304', 6, '04/09/2024'),
(283, 'G305', 6, '05/07/2024'),
(284, 'G306', 6, '05/09/2024'),
(285, 'G308', 6, '15/08/2024'),
(286, 'G309', 6, NULL),
(287, 'G310', 6, NULL),
(288, 'G401', 6, '02/07/2024'),
(289, 'G402', 6, '17/06/2024'),
(290, 'G403', 6, '13/06/2024'),
(291, 'G404', 6, '07/07/2024'),
(292, 'G405', 6, '27/08/2024'),
(293, 'G406', 6, '16/08/2024'),
(294, 'G407', 6, '15/08/2024'),
(295, 'G408', 6, '28/11/2024'),
(296, 'G409', 6, NULL),
(297, 'G501', 6, '08/11/2024'),
(298, 'G502', 6, NULL),
(299, 'G503', 6, '03/12/2024'),
(300, 'G504', 6, NULL),
(301, 'S-G505', 6, '03/12/2024');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `edificios`
--

CREATE TABLE `edificios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `edificios`
--

INSERT INTO `edificios` (`id`, `nombre`) VALUES
(1, 'Alfa'),
(2, 'Bravo'),
(6, 'Casa Maat'),
(3, 'Charly'),
(4, 'Eco'),
(5, 'Fox');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mantenimientos`
--

CREATE TABLE `mantenimientos` (
  `id` int(11) NOT NULL,
  `cuarto_id` int(11) NOT NULL,
  `descripcion` text NOT NULL,
  `tipo` enum('normal','rutina') NOT NULL DEFAULT 'normal',
  `hora` time DEFAULT NULL,
  `dia_alerta` date DEFAULT NULL COMMENT 'Fecha específica para la alerta (si es tipo rutina)',
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `mantenimientos`
--

INSERT INTO `mantenimientos` (`id`, `cuarto_id`, `descripcion`, `tipo`, `hora`, `dia_alerta`, `fecha_registro`) VALUES
(63, 3, 'FOCOS FUNDIDOS', 'normal', NULL, NULL, '2025-04-22 19:31:45'),
(79, 1, 'Cerrar valvulas', 'normal', NULL, NULL, '2025-04-22 20:15:27'),
(80, 1, 'Foco fundido', 'normal', NULL, NULL, '2025-04-22 20:16:17'),
(81, 4, 'Foco fundido', 'normal', NULL, NULL, '2025-04-22 20:16:36');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `cuartos`
--
ALTER TABLE `cuartos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`,`edificio_id`),
  ADD KEY `edificio_id` (`edificio_id`);

--
-- Indices de la tabla `edificios`
--
ALTER TABLE `edificios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `mantenimientos`
--
ALTER TABLE `mantenimientos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cuarto_id` (`cuarto_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `cuartos`
--
ALTER TABLE `cuartos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=302;

--
-- AUTO_INCREMENT de la tabla `edificios`
--
ALTER TABLE `edificios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `mantenimientos`
--
ALTER TABLE `mantenimientos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=85;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `cuartos`
--
ALTER TABLE `cuartos`
  ADD CONSTRAINT `cuartos_ibfk_1` FOREIGN KEY (`edificio_id`) REFERENCES `edificios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `mantenimientos`
--
ALTER TABLE `mantenimientos`
  ADD CONSTRAINT `mantenimientos_ibfk_1` FOREIGN KEY (`cuarto_id`) REFERENCES `cuartos` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
